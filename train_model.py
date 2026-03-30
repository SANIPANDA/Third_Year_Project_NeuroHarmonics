import os
os.environ['MPLCONFIGDIR'] = os.path.join(os.getcwd(), "matplotlib_cache")

from processor import EEGProcessor
import numpy as np
import pandas as pd
from collections import Counter
from sklearn.utils import resample

# =========================
# LABEL MAPPING (FINAL)
# =========================
# Model will train on numbers (0–3)
EMOTION_TO_NUM = {
    "angry": 0,
    "happy": 1,
    "sad": 2,
    "tired": 3
}

NUM_TO_EMOTION = {
    0: "Angry",
    1: "Happy",
    2: "Sad",
    3: "Tired"
}

# =========================
# BALANCE FUNCTION
# =========================
def balance_data(X, y):
    df = pd.DataFrame(X)
    df['label'] = y

    max_size = df['label'].value_counts().max()

    df_balanced = pd.concat([
        resample(group, replace=True, n_samples=max_size, random_state=42)
        for _, group in df.groupby('label')
    ])

    X_bal = df_balanced.drop('label', axis=1).values
    y_bal = df_balanced['label'].values

    return X_bal, y_bal

# =========================
# MAIN TRAINING
# =========================
processor = EEGProcessor()

X_all = []
y_all = []

# =========================
# DATASET (USE CORRECT LABELS)
# =========================
dataset = [
    ("data/happy1.csv", EMOTION_TO_NUM["happy"]),
    ("data/sad1.csv", EMOTION_TO_NUM["sad"]),
    ("data/angry1.csv", EMOTION_TO_NUM["angry"]),
    ("data/tired1.csv", EMOTION_TO_NUM["tired"]),
]

# =========================
# FEATURE EXTRACTION
# =========================
for file, label in dataset:
    print(f"Processing: {file} -> Label: {NUM_TO_EMOTION[label]}")

    features = processor.process_signal(file, ".csv")

    for f in features:
        X_all.append(f)
        y_all.append(label)

# Convert to numpy
X_all = np.array(X_all)
y_all = np.array(y_all)

# =========================
# DEBUG BEFORE BALANCING
# =========================
print("\nBefore balancing:", Counter(y_all))

# =========================
# BALANCE DATA
# =========================
X_bal, y_bal = balance_data(X_all, y_all)

# =========================
# DEBUG AFTER BALANCING
# =========================
print("After balancing:", Counter(y_bal))

# =========================
# TRAIN MODEL
# =========================
accuracy = processor.train_model(X_bal, y_bal)

print("\n✅ Final Accuracy:", accuracy)

# =========================
# FINAL LABEL CHECK
# =========================
print("\nFinal Label Distribution:", Counter(y_bal))