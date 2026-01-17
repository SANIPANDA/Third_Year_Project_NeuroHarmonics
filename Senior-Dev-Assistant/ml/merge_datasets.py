import pandas as pd
import numpy as np

# Load Excel file
df = pd.read_excel("data/raw/eeg_stress_experiment.xlsx")

# Clean column names
df.columns = [str(c).strip() for c in df.columns]

# Drop unnamed junk columns
df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

# Drop metadata (keep Segment!)
df = df.drop(columns=["Subject (No.)", "Gender"], errors="ignore")

# Map EO / AC1 / AC2 to labels
def map_segment(seg):
    seg = str(seg).upper()
    if "EO" in seg:
        return "Calm"
    if "AC1" in seg:
        return "Focus"
    if "AC2" in seg:
        return "Stress"
    return None

df["label"] = df["Segment"].apply(map_segment)

# Drop rows without valid segment
df = df.dropna(subset=["label"])

# Drop Segment column (label replaces it)
df = df.drop(columns=["Segment"])

# Force all EEG feature columns to numeric
for col in df.columns:
    if col != "label":
        df[col] = pd.to_numeric(df[col], errors="coerce")

# 🚨 IMPORTANT CHANGE:
# Drop rows ONLY if *all* EEG features are missing
feature_cols = [c for c in df.columns if c != "label"]
df = df.dropna(subset=feature_cols, how="all")

# Fill remaining NaNs with column mean (safe for EEG)
df[feature_cols] = df[feature_cols].fillna(df[feature_cols].mean())

# Save final dataset
df.to_csv("data/raw/eeg_data.csv", index=False)

print("✅ EEG dataset prepared correctly")
print("Total samples:", len(df))
print("\nLabel distribution:")
print(df["label"].value_counts())
