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
    ("data/happy.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy1.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy2.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy3.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy4.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy5.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy6.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy7.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy8.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy9.csv", EMOTION_TO_NUM["happy"]),
    ("data/happy10.csv", EMOTION_TO_NUM["happy"]),
    ("data/sad.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad1.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad2.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad3.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad4.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad5.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad6.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad7.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad8.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad9.csv", EMOTION_TO_NUM["sad"]),
    ("data/sad10.csv", EMOTION_TO_NUM["sad"]),
    ("data/angry.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry1.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry2.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry3.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry4.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry5.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry6.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry7.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry8.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry9.csv", EMOTION_TO_NUM["angry"]),
    ("data/angry10.csv", EMOTION_TO_NUM["angry"]),
    ("data/tired.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired1.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired2.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired3.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired4.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired5.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired6.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired7.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired8.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired9.csv", EMOTION_TO_NUM["tired"]),
    ("data/tired10.csv", EMOTION_TO_NUM["tired"]),
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