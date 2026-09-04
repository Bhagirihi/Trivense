"""Campaign and custom post scheduling for Rasoi Instagram ads."""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

SERVER_ROOT = Path(__file__).resolve().parent
REPO_ROOT = SERVER_ROOT.parents[2]
PROMPTS_FILE = REPO_ROOT / "docs" / "marketing" / "AD_IMAGE_PROMPTS.md"
AD_IMAGES_DIR = REPO_ROOT / "docs" / "marketing" / "ad-images"
STATE_FILE = SERVER_ROOT / "schedule-state.json"
CUSTOM_FILE = SERVER_ROOT / "custom-schedule.json"

IST = timezone(timedelta(hours=5, minutes=30))
CAMPAIGN_START = datetime(2026, 6, 17, 10, 0, tzinfo=IST)
POST_INTERVAL = timedelta(days=1)
POST_HOUR = 10  # 10 AM IST daily

APK_DOWNLOAD_URL = "https://rasoiapplication.in/download"

from instagram_seo import BASE_HASHTAGS, CAPTION_SEO_LINE, PROFILE_BIO, PROFILE_FULL_NAME

SEGMENT_HASHTAGS: dict[str, str] = {
    "Housewives": "#AajKyaBanaye #Homemaker #IndianMom #DinnerIdeas",
    "Working Women": "#WorkingWomen #OfficeToHome #QuickDinner #MumbaiFood",
    "Working women": "#WorkingWomen #OfficeToHome #QuickDinner #MumbaiFood",
    "Families": "#IndianFamily #FamilyDinner #KidFriendly #VegFood",
    "Newly Married Couples": "#NewlyWeds #PehliRasoi #CoupleCooking",
    "Newlyweds": "#NewlyWeds #PehliRasoi #CoupleCooking",
    "Bachelors / PG Hostel": "#PGlife #HostelCooking #BachelorPad #EasyRecipes",
    "Bachelors/PG": "#PGlife #HostelCooking #BachelorPad #EasyRecipes",
    "Jain Household": "#JainFood #PureVeg #Satvik #JainRecipes",
    "Jain": "#JainFood #PureVeg #Satvik #JainRecipes",
    "Gujarati Regional Pride": "#Jamvanu #GujaratiFood #Ahmedabad #Surat #Handvo #JamvanuRecipe",
    "Gujarati": "#Jamvanu #GujaratiFood #Ahmedabad #Surat #Handvo #JamvanuRecipe",
    "South Indian Morning": "#SouthIndianFood #Dosa #Idli #Breakfast",
    "South Indian": "#SouthIndianFood #Dosa #Idli #Breakfast",
    "Punjabi Hearty Dinner": "#PunjabiFood #NorthIndian #DalTadka #Paneer",
    "Punjabi": "#PunjabiFood #NorthIndian #DalTadka #Paneer",
    "Dual-Income No Time": "#WorkingCouple #WeeknightDinner #QuickMeals",
    "Dual-income": "#WorkingCouple #WeeknightDinner #QuickMeals",
    "Leftovers": "#LeftoverRecipes #ZeroWaste #SmartCooking",
    "Quick": "#QuickRecipes #Under20Minutes #FastDinner",
    "Parents": "#PickyEaters #KidsFood #ParentLife",
    "Monsoon": "#MonsoonFood #RainyDay #Pakoras",
    "Notifications": "#MealReminder #SmartKitchen",
    "Pantry match": "#PantryCooking #IngredientMatch #CookWithWhatYouHave",
    "Partners": "#Blinkit #Zepto #GroceryDelivery",
    "Multi-gen": "#GrandmaRecipes #FamilyTradition",
    "Beginner": "#FirstTimeCook #EasyRecipes #KitchenBeginner",
    "Husband cooks": "#HusbandCooking #MenWhoCook",
    "Mumbai commute": "#MumbaiLife #LocalTrain #MumbaiFood",
    "WFH": "#WorkFromHome #LunchBreak #WFHLife",
    "Late night": "#LateNightSnacks #MidnightCravings",
    "Bengali non-veg": "#BengaliFood #FishCurry #MachhBhaat",
    "Roommates": "#Flatmates #SharedKitchen #RoommateLife",
    "Sunday": "#SundaySpecial #WeekendCooking",
    "Tier-2 cities": "#Tier2India #Bharat #HomeCooking",
    "Low pantry": "#EmptyFridge #MinimalIngredients",
    "Universal": "#IndianKitchen #DinnerSorted",
    "Fitness/gym": "#PostWorkout #ProteinMeals #GymDiet",
    "Seniors": "#SeniorLiving #EasyCooking",
    "Diabetic": "#DiabeticFriendly #SugarFree #HealthyEating",
    "Maharashtrian": "#MaharashtrianFood #MarathiRecipes #MisalPav",
    "Rajasthani": "#RajasthaniFood #DalBaati #DesertKitchen",
    "Hyderabadi": "#HyderabadiBiryani #TelanganaFood #DumBiryani",
    "Navratri": "#Navratri #VratFood #FastingRecipes",
    "Summer": "#SummerFood #LightMeals #Garmi",
    "Winter": "#WinterFood #ComfortFood #GaramKhana",
    "Guests": "#Hosting #MehmanNawazi #PartyPrep",
    "Maid off": "#HomeChef #SelfCooking",
    "Exam season": "#ExamTime #StudentFood #BrainFood",
    "Pregnancy": "#PregnancyFood #MaaToBe #Nutrition",
    "Recovery": "#LightDiet #RecoveryFood #SoftFood",
    "One-pot": "#OnePotMeals #PressureCooker #Khichdi",
    "Air fryer": "#AirFryer #HealthyCooking #OilFree",
    "Single parent": "#SingleParent #Parenting",
    "Weekend dad": "#WeekendDad #DadLife #CookingWithKids",
    "Saas impress": "#IndianWedding #SaasBahur #InLaws",
    "Office tiffin": "#OfficeLunch #TiffinBox #MealPrep",
    "NRI return": "#NRI #Homecoming #IndianFoodAbroad",
    "Kerala/Onam": "#KeralaFood #Onam #Sadya",
    "Andhra spicy": "#AndhraFood #SpicyFood #TeluguFood",
    "Kashmiri": "#KashmiriFood #Wazwan",
    "Goan coastal": "#GoanFood #CoastalFood #Coconut",
    "Chaat at home": "#Chaat #StreetFood #HomeMadeChaat",
    "Budget": "#BudgetMeals #Under50Rupees #StudentBudget",
    "Micro kitchen": "#SmallKitchen #StudioApartment #TinyKitchen",
    "Party scale": "#PartyFood #Hosting #Serves8",
    "Tamil sattvik": "#TamilFood #Sattvik #BrahminFood",
    "Tamil Brahmin Sattvik": "#TamilFood #Sattvik #BrahminFood",
}


def _read_state() -> dict[str, Any]:
    if not STATE_FILE.is_file():
        return {"published": {}, "scheduled": {}}
    state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    state.setdefault("published", {})
    state.setdefault("scheduled", {})
    return state


def _write_state(state: dict[str, Any]) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def _read_custom() -> list[dict[str, Any]]:
    if not CUSTOM_FILE.is_file():
        return []
    return json.loads(CUSTOM_FILE.read_text(encoding="utf-8"))


def _write_custom(rows: list[dict[str, Any]]) -> None:
    CUSTOM_FILE.write_text(json.dumps(rows, indent=2), encoding="utf-8")


def _shorten(text: str, max_len: int = 140) -> str:
    text = " ".join(text.split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rsplit(" ", 1)[0] + "…"


def _segment_tags(segment: str) -> str:
    if segment in SEGMENT_HASHTAGS:
        return SEGMENT_HASHTAGS[segment]
    for key, tags in SEGMENT_HASHTAGS.items():
        if key.lower() in segment.lower() or segment.lower() in key.lower():
            return tags
    slug = re.sub(r"[^a-zA-Z0-9]+", "", segment.split()[0]) if segment else "Rasoi"
    return f"#{slug}Food"


def _parse_campaign_ads() -> list[dict[str, Any]]:
    text = PROMPTS_FILE.read_text(encoding="utf-8")
    pattern = re.compile(
        r"## Ad (\d+) — (.+?)\n\n"
        r"\*\*Audience:\*\* (.+?)\n"
        r"\*\*Headline:\*\* (.+?)\n"
        r"\*\*Subheadline:\*\* (.+?)\n"
        r"(?:.*?\n)*?"
        r"\*\*Result:\*\* (.+?)\n",
        re.MULTILINE,
    )
    ads: list[dict[str, Any]] = []
    for match in pattern.finditer(text):
        post_id = int(match.group(1))
        image_matches = sorted(AD_IMAGES_DIR.glob(f"{post_id:02d}-*.png"))
        if not image_matches:
            continue
        scheduled_at = CAMPAIGN_START + POST_INTERVAL * (post_id - 1)
        ads.append(
            {
                "id": post_id,
                "segment": match.group(2).strip(),
                "audience": match.group(3).strip(),
                "headline": match.group(4).strip(),
                "subheadline": match.group(5).strip(),
                "result": match.group(6).strip(),
                "image_path": str(image_matches[0].relative_to(REPO_ROOT)),
                "scheduled_at": scheduled_at.isoformat(),
            }
        )
    return ads


def build_caption(ad: dict[str, Any]) -> str:
    segment = ad.get("segment", "")
    audience = ad.get("audience", "")
    headline = ad["headline"]
    subheadline = ad["subheadline"]
    result = _shorten(ad.get("result", ""), 160)
    segment_tags = _segment_tags(segment)

    lines = [
        CAPTION_SEO_LINE,
        "",
        headline,
        "",
        subheadline,
        "",
        f"👩‍🍳 {segment} · {audience}",
        "",
        result,
        "",
        "Rasoi recipe app — 4,000+ Indian recipes, pantry match, meal reminders.",
        "",
        "📲 Download Rasoi app free (Android APK):",
        APK_DOWNLOAD_URL,
        "",
        f"{BASE_HASHTAGS} {segment_tags}",
    ]
    caption = "\n".join(lines)
    if len(caption) > 2200:
        caption = caption[:2197] + "…"
    return caption


def resolve_repo_path(path: str) -> Path:
    candidate = Path(path)
    if candidate.is_file():
        return candidate.resolve()
    repo_path = (REPO_ROOT / path).resolve()
    if repo_path.is_file():
        return repo_path
    raise FileNotFoundError(f"Image not found: {path}")


def load_campaign_posts() -> list[dict[str, Any]]:
    state = _read_state()
    published = state.get("published", {})
    scheduled = state.get("scheduled", {})
    rows: list[dict[str, Any]] = []
    for ad in _parse_campaign_ads():
        post_id = str(ad["id"])
        pub = published.get(post_id)
        sched = scheduled.get(post_id)
        rows.append(
            {
                **ad,
                "caption": build_caption(ad),
                "published": bool(pub),
                "published_at": pub.get("published_at") if pub else None,
                "media_id": pub.get("media_id") if pub else sched.get("media_id") if sched else None,
                "url": pub.get("url") if pub else sched.get("url") if sched else None,
                "instagram_scheduled": bool(sched) and not bool(pub),
                "instagram_scheduled_at": sched.get("scheduled_at") if sched else None,
            }
        )
    return rows


def get_campaign_post(post_id: int) -> dict[str, Any]:
    for row in load_campaign_posts():
        if row["id"] == post_id:
            return row
    raise KeyError(f"Campaign post {post_id} not found")


def mark_campaign_published(post_id: int, result: dict[str, Any]) -> None:
    state = _read_state()
    published = state.setdefault("published", {})
    scheduled = state.setdefault("scheduled", {})
    published[str(post_id)] = {
        "published_at": datetime.now(tz=IST).isoformat(),
        "media_id": result.get("media_id"),
        "url": result.get("url"),
    }
    scheduled.pop(str(post_id), None)
    _write_state(state)


def mark_campaign_scheduled(post_id: int, result: dict[str, Any], scheduled_at: str) -> None:
    state = _read_state()
    scheduled = state.setdefault("scheduled", {})
    scheduled[str(post_id)] = {
        "scheduled_at": scheduled_at,
        "media_id": result.get("media_id"),
        "code": result.get("code"),
        "url": result.get("url"),
        "queued_at": datetime.now(tz=IST).isoformat(),
    }
    _write_state(state)


def get_due_campaign_posts(now: datetime | None = None) -> list[dict[str, Any]]:
    now = now or datetime.now(tz=IST)
    due: list[dict[str, Any]] = []
    for row in load_campaign_posts():
        if row["published"] or row.get("instagram_scheduled"):
            continue
        scheduled_at = datetime.fromisoformat(row["scheduled_at"])
        if scheduled_at <= now:
            due.append(row)
    return sorted(due, key=lambda row: row["id"])


def get_posts_to_schedule() -> list[dict[str, Any]]:
    return [
        row
        for row in load_campaign_posts()
        if not row["published"] and not row.get("instagram_scheduled")
    ]


def campaign_overview(limit: int = 20, include_published: bool = True) -> list[dict[str, Any]]:
    rows = load_campaign_posts()
    if not include_published:
        rows = [row for row in rows if not row["published"]]
    return rows[:limit]


def add_custom_post(
    image_path: str,
    caption: str,
    scheduled_at: str,
) -> dict[str, Any]:
    scheduled = datetime.fromisoformat(scheduled_at)
    if scheduled.tzinfo is None:
        scheduled = scheduled.replace(tzinfo=IST)
    row = {
        "id": f"custom-{int(datetime.now(tz=IST).timestamp())}",
        "image_path": image_path,
        "caption": caption,
        "scheduled_at": scheduled.isoformat(),
        "published": False,
    }
    rows = _read_custom()
    rows.append(row)
    _write_custom(rows)
    return row


def list_custom_posts(include_published: bool = True) -> list[dict[str, Any]]:
    rows = _read_custom()
    if include_published:
        return rows
    return [row for row in rows if not row.get("published")]


def get_due_custom_posts(now: datetime | None = None) -> list[dict[str, Any]]:
    now = now or datetime.now(tz=IST)
    due: list[dict[str, Any]] = []
    for row in list_custom_posts(include_published=False):
        scheduled_at = datetime.fromisoformat(row["scheduled_at"])
        if scheduled_at <= now:
            due.append(row)
    return due


def mark_custom_published(post_id: str, result: dict[str, Any]) -> None:
    rows = _read_custom()
    for row in rows:
        if row["id"] == post_id:
            row["published"] = True
            row["published_at"] = datetime.now(tz=IST).isoformat()
            row["media_id"] = result.get("media_id")
            row["url"] = result.get("url")
    _write_custom(rows)
