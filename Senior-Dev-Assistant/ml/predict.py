import joblib
import numpy as np
import json

model = joblib.load("eeg_model.pkl")

def predict_emotion(eeg_values):
    eeg_array = np.array(eeg_values).reshape(1, -1)

    features = [
        np.mean(eeg_array),
        np.std(eeg_array),
        np.var(eeg_array),
        np.max(eeg_array),
        np.min(eeg_array)
    ]

    probs = model.predict_proba([features])[0]
    prediction = model.classes_[np.argmax(probs)]
    confidence = float(np.max(probs) * 100)

    return {
        "emotion": prediction,
        "confidence": round(confidence)
    }

# ---- ENTRY POINT ----
if __name__ == "__main__":
    # Temporary simulated EEG values
    sample = np.random.rand(20).tolist()

    result = predict_emotion(sample)
    print(json.dumps(result))   # 👈 IMPORTANT
