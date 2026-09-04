import React, { useState, useEffect } from "react";
import { shadowStyle } from "../utils/platformStyles";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { expenseBoardService } from "../services/expenseBoardService";
import { showToast } from "../utils/toast";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../hooks/useTranslation";

export const ExpenseBoardList = ({
  selectedBoard,
  onSelectBoard,
  onCreateBoard,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const data = await expenseBoardService.getExpenseBoards();
      setBoards(data);
    } catch (error) {
      console.error("Error fetching boards:", error);
      showToast.error("Failed to fetch expense boards");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{t("expenseBoard")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardsList}
      >
        <TouchableOpacity
          style={[
            styles.addNewItem,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={onCreateBoard}
        >
          <View
            style={[
              styles.addNewIcon,
              {
                backgroundColor: `${theme.primary}15`,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={22}
              color={theme.primary}
            />
          </View>
          <Text style={[styles.addNewText, { color: theme.text }]}>
            Add New
          </Text>
        </TouchableOpacity>
        {boards.map((board) => (
          <TouchableOpacity
            key={board.id}
            style={[
              styles.boardItem,
              {
                backgroundColor:
                  selectedBoard === board.id ? theme.primary : theme.card,
                borderWidth: selectedBoard === board.id ? 2 : 1,
                borderColor:
                  selectedBoard === board.id ? theme.primary : theme.border,
              },
            ]}
            onPress={() => onSelectBoard(board.id, board.name)}
          >
            <View
              style={[
                styles.boardIcon,
                {
                  backgroundColor: `${board.color}15`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={board.icon || "view-grid"}
                size={22}
                color={board.color || theme.primary}
              />
            </View>
            <Text
              style={[
                styles.boardName,
                {
                  color: selectedBoard === board.id ? theme.white : theme.text,
                },
              ]}
            >
              {board.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  loadingContainer: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.8,
  },
  boardsList: {
    paddingRight: 12,
  },
  boardItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginRight: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    ...shadowStyle(2),
    minWidth: 100,
  },
  boardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  boardName: {
    fontSize: 13,
    fontWeight: "600",
  },
  addNewItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    ...shadowStyle(2),
    minWidth: 100,
  },
  addNewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  addNewText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
