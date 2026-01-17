import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

def load_and_preprocess(csv_path):
    df = pd.read_csv(csv_path)

    # ----- HARD CHECKS -----
    if "label" not in df.columns:
        raise ValueError("❌ 'label' column not found in dataset")

    # Separate features and labels
    y = df["label"]

    # Keep ONLY numeric columns for X
    X = df.drop(columns=["label"])
    X = X.select_dtypes(include=["number"])

    if X.shape[0] == 0:
        raise ValueError("❌ No numeric EEG features found")

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return train_test_split(
        X_scaled,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )
