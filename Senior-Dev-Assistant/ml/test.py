
from preprocessing import load_and_preprocess
from features import extract_features
import joblib
from sklearn.metrics import classification_report, accuracy_score

DATA_PATH = "data/raw/eeg_data.csv"

print("Loading model...")
model = joblib.load("eeg_model.pkl")

X_train, X_test, y_train, y_test = load_and_preprocess(DATA_PATH)

X_test_feat = extract_features(X_test)

print("Predicting...")
y_pred = model.predict(X_test_feat)

print("\nAccuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))
