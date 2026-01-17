from preprocessing import load_and_preprocess
from features import extract_features
from model import get_model
import joblib

DATA_PATH = "data/raw/eeg_data.csv"

print("Loading and preprocessing data...")
X_train, X_test, y_train, y_test = load_and_preprocess(DATA_PATH)

print("Extracting features...")
X_train_feat = extract_features(X_train)
X_test_feat = extract_features(X_test)

print("Training model...")
model = get_model()
model.fit(X_train_feat, y_train)

print("Saving trained model...")
joblib.dump(model, "eeg_model.pkl")

print("Training complete!")
