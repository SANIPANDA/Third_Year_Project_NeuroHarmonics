import matplotlib
matplotlib.use('Agg')

import matplotlib.pyplot as plt
import mne
import numpy as np
import pandas as pd
import io
import base64
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


class EEGProcessor:
    def __init__(self, trained_classifier=None, fs=256):
        self.fs = fs
        self.classifier = trained_classifier
        self.scaler = StandardScaler()

        # EEG Bands
        self.bands = {
            'Delta': (0.5, 4),
            'Theta': (4, 8),
            'Alpha': (8, 13),
            'Beta': (13, 30),
            'Gamma': (30, 50)
        }

        # Load trained model automatically if exists
        try:
            self.classifier = joblib.load("emotion_model.pkl")
            self.scaler = joblib.load("scaler.pkl")
            print("✅ Model loaded successfully")
        except:
            print("⚠️ Model not found. Train first.")

    # ==============================
    # MAIN SIGNAL PROCESSING PIPELINE
    # ==============================
    def process_signal(self, file_path, extension=None, label=None):

        # 1. Read EEG Signal
        if extension == '.edf' or file_path.endswith('.edf'):
            raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
        else:
            df = pd.read_csv(file_path)

            # Clean dataset
            df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
            df = df.dropna(axis=1, how='all')

            info = mne.create_info(
                ch_names=list(df.columns),
                sfreq=self.fs,
                ch_types='eeg'
            )

            raw = mne.io.RawArray(df.values.T, info, verbose=False)

        # 2. Filtering
        raw.filter(l_freq=0.5, h_freq=50.0, verbose=False)
        raw.notch_filter(freqs=50.0, verbose=False)

        # 3. Artifact Removal (ICA)
        try:
            ica = mne.preprocessing.ICA(n_components=10, random_state=42, max_iter=300)
            ica.fit(raw)
            raw = ica.apply(raw)
        except Exception as e:
            print(f"ICA warning: {e}")

        # Referencing
        try:
            raw.set_eeg_reference('average', verbose=False)
        except Exception as e:
            print(f"Reference warning: {e}")

        # 4. Segmentation (2 sec windows)
        epochs = mne.make_fixed_length_epochs(raw, duration=2.0, preload=True, verbose=False)

        # 5. PSD
        psds, freqs = mne.time_frequency.psd_array_welch(
            epochs.get_data(),
            sfreq=raw.info['sfreq'],
            fmin=0.5,
            fmax=50.0,
            verbose=False
        )

        # 6. Band Power
        band_powers = []

        for _, (fmin, fmax) in self.bands.items():
            idx_band = np.logical_and(freqs >= fmin, freqs <= fmax)
            bp = psds[:, :, idx_band].mean(axis=(1, 2))
            band_powers.append(bp)

        features = np.array(band_powers).T

        # 7. Normalize (Relative Power)
        total_power = features.sum(axis=1, keepdims=True)

        relative_features = np.divide(
            features,
            total_power,
            out=np.zeros_like(features),
            where=total_power != 0
        ) * 100

        if label is not None:
            labels = np.full((relative_features.shape[0],), label)
            return relative_features, labels

        return relative_features

    # ==============================
    # MODEL TRAINING
    # ==============================
    def train_model(self, X, y):

        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)

        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )

        self.classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42
        )

        self.classifier.fit(X_train, y_train)

        acc = self.classifier.score(X_test, y_test)
        print(f"Model Accuracy: {acc:.2f}")

        # Save model + scaler
        joblib.dump(self.classifier, "emotion_model.pkl")
        joblib.dump(self.scaler, "scaler.pkl")

        return acc

    # ==============================
    # PREDICTION
    # ==============================
    def predict_emotion(self, features):

        if self.classifier is None:
            raise Exception("Model not loaded. Train or load model first.")

        # Scale features
        features_scaled = self.scaler.transform(features)

        # Predict probabilities for ALL segments
        probs = self.classifier.predict_proba(features_scaled)

        # Average probabilities across segments
        avg_probs = np.mean(probs, axis=0)

        classes = self.classifier.classes_

        probs_dict = {
            str(classes[i]): float(avg_probs[i]) 
            for i in range(len(classes))
        }

        max_idx = np.argmax(avg_probs)

        prediction = classes[max_idx]
        confidence = avg_probs[max_idx]

        return probs_dict, prediction, confidence

    # ==============================
    # PLOT
    # ==============================
    def generate_plot(self, emotion_probs):

        plt.figure(figsize=(6, 4))
        plt.clf()

        colors = ['#FF4B4B', '#1C83E1', '#808080', '#2ECC71']

        plt.bar(emotion_probs.keys(), emotion_probs.values(), color=colors[:len(emotion_probs)])

        plt.ylim(0, 1)
        plt.ylabel('Confidence')
        plt.title('Emotion Detection Results')

        img = io.BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)

        plot_url = base64.b64encode(img.getvalue()).decode()
        plt.close()

        return plot_url