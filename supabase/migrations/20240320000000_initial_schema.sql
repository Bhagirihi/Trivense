-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE expense_status AS ENUM ('pending', 'settled', 'cancelled');
    EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi', 'net_banking');
    EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    full_name TEXT,
    email_address TEXT,
    mobile TEXT,
    avatar_url TEXT,
    has_notifications BOOLEAN DEFAULT false,
    current_plan TEXT DEFAULT 'free' CHECK (current_plan IN ('free', 'premium', 'business')),
    is_google_connected BOOLEAN DEFAULT false,
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_board_id UUID;
BEGIN
    -- Insert into profiles table
    INSERT INTO public.profiles (
        id,
        full_name,
        email_address,
        mobile,
        avatar_url,
        has_notifications,
        current_plan,
        is_google_connected,
        account_status
    )
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        NEW.raw_user_meta_data->>'mobile',
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE((NEW.raw_user_meta_data->>'has_notifications')::boolean, false),
        'free',
        COALESCE((NEW.raw_user_meta_data->>'is_google_connected')::boolean, false),
        'active'
    );

    -- Create default categories for the new user
    INSERT INTO public.categories (
        name,
        description,
        icon,
        color,
        user_id,
        is_default
    )
    VALUES
        ('Food', 'Food and dining expenses', 'food', '#FF6B6B', NEW.id, true),
        ('Transport', 'Transportation costs', 'car', '#4ECDC4', NEW.id, true),
        ('Shopping', 'Shopping and retail', 'shopping', '#45B7D1', NEW.id, true),
        ('Entertainment', 'Entertainment and leisure', 'movie', '#96CEB4', NEW.id, true),
        ('Health', 'Health and medical expenses', 'heart', '#FFEEAD', NEW.id, true),
        ('Education', 'Education and learning', 'book', '#D4A5A5', NEW.id, true),
        ('Housing', 'Housing and utilities', 'home', '#9B59B6', NEW.id, true),
        ('Travel', 'Travel and tourism', 'airplane', '#3498DB', NEW.id, true);

    -- Create a default "General Expense" board
    INSERT INTO public.expense_boards (
        name,
        description,
        total_budget,
        created_by
    )
    VALUES (
        'General Expenses',
        'Default board for tracking general expenses',
        NULL,  -- No specific budget limit
        NEW.id
    )
    RETURNING id INTO default_board_id;

    -- Log the successful creation
    RAISE NOTICE 'Created default data for user %: Profile, Categories, and General Expense Board (ID: %)',
        NEW.id,
        default_board_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create expense_boards table
CREATE TABLE expense_boards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    total_budget DECIMAL(10,2),
    created_by UUID REFERENCES auth.users ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security for expense_boards
ALTER TABLE expense_boards ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_boards
CREATE POLICY "Users can view their own expense boards"
    ON expense_boards FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own expense boards"
    ON expense_boards FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own expense boards"
    ON expense_boards FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own expense boards"
    ON expense_boards FOR DELETE
    USING (auth.uid() = created_by);

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own categories and default categories"
    ON public.categories FOR SELECT
    USING (user_id = auth.uid() OR is_default = true);

CREATE POLICY "Users can create their own categories"
    ON public.categories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    USING (user_id = auth.uid() AND is_default = false);

-- Insert default categories
INSERT INTO public.categories (name, description, icon, color, is_default)
VALUES
    ('Food', 'Food and dining expenses', 'food', '#FF6B6B', true),
    ('Transport', 'Transportation costs', 'car', '#4ECDC4', true),
    ('Shopping', 'Shopping and retail', 'shopping', '#45B7D1', true),
    ('Entertainment', 'Entertainment and leisure', 'movie', '#96CEB4', true),
    ('Health', 'Health and medical expenses', 'heart', '#FFEEAD', true),
    ('Education', 'Education and learning', 'book', '#D4A5A5', true),
    ('Housing', 'Housing and utilities', 'home', '#9B59B6', true),
    ('Travel', 'Travel and tourism', 'airplane', '#3498DB', true)
ON CONFLICT DO NOTHING;

-- Create expenses table
CREATE TABLE expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    board_id UUID REFERENCES expense_boards ON DELETE CASCADE,
    category_id UUID REFERENCES categories ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses
CREATE POLICY "Users can view expenses in their boards"
    ON expenses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM expense_boards
            WHERE expense_boards.id = expenses.board_id
            AND expense_boards.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create expenses in their boards"
    ON expenses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM expense_boards
            WHERE expense_boards.id = expenses.board_id
            AND expense_boards.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update expenses in their boards"
    ON expenses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM expense_boards
            WHERE expense_boards.id = expenses.board_id
            AND expense_boards.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete expenses in their boards"
    ON expenses FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM expense_boards
            WHERE expense_boards.id = expenses.board_id
            AND expense_boards.created_by = auth.uid()
        )
    );

-- Create expense_participants table
CREATE TABLE expense_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    expense_id UUID REFERENCES expenses ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(expense_id, user_id)
);

-- Enable Row Level Security for expense_participants
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_participants
CREATE POLICY "Users can view participants in their expenses"
    ON expense_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM expenses
            JOIN expense_boards ON expense_boards.id = expenses.board_id
            WHERE expenses.id = expense_participants.expense_id
            AND expense_boards.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage participants in their expenses"
    ON expense_participants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM expenses
            JOIN expense_boards ON expense_boards.id = expenses.board_id
            WHERE expenses.id = expense_participants.expense_id
            AND expense_boards.created_by = auth.uid()
        )
    );

-- Create settlements table
CREATE TABLE settlements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    board_id UUID REFERENCES expense_boards ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    to_user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security for settlements
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Create policies for settlements
CREATE POLICY "Users can view settlements in their boards"
    ON settlements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM expense_boards
            WHERE expense_boards.id = settlements.board_id
            AND expense_boards.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage settlements in their boards"
    ON settlements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM expense_boards
            WHERE expense_boards.id = settlements.board_id
            AND expense_boards.created_by = auth.uid()
        )
    );
