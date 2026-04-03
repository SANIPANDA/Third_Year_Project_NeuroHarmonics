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
    def generate_plot(self, probs_dict):
        import matplotlib.pyplot as plt
        import numpy as np
        import io
        import base64

        # 1. Prepare the Data from Probability Dictionary
        # This ensures the graph shows the ACTUAL confidence per mood
        if isinstance(probs_dict, dict):
            moods = list(probs_dict.keys())
            # Convert 0.0-1.0 probabilities to 0-100 percentages
            percentages = [val * 100 for val in probs_dict.values()]
        else:
            # Fallback if raw features are accidentally passed
            moods = ['Tired', 'Sad', 'Happy', 'Angry']
            features = np.array(probs_dict, copy=True).flatten()
            total = np.sum(features)
            percentages = [(v / total) * 100 if total > 0 else 25 for v in features]

        # 2. Configure the Plot Size
        plt.figure(figsize=(4, 3)) 
        plt.clf()

        # 3. Apply the Purple Aesthetic
        # Using a distinct palette for each mood to make them distinguishable
        purple_palette = ['#7b2ff2', '#9d4edd', '#c8b6ff', '#e0aaff', '#4f46e5']
        
        # Create the bar chart
        bars = plt.bar(moods, percentages, color=purple_palette[:len(moods)], alpha=0.9, width=0.6)

        # 4. Styling for Dark/Purple Dashboard
        plt.title('Neural Confidence vs. Mood', fontsize=10, fontweight='bold', color='#e0aaff', pad=15)
        plt.ylim(0, 110) # 110 allows space for the percentage text on top
        plt.ylabel('Probability (%)', fontsize=8, color='#e0aaff')
        
        # Remove borders and style axis to blend with glassmorphism
        ax = plt.gca()
        ax.set_facecolor('none')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#5a189a')
        ax.spines['bottom'].set_color('#5a189a')
        
        plt.tick_params(colors='#e0aaff', labelsize=8)
        plt.grid(axis='y', linestyle='--', alpha=0.1)

        # 5. Add Percentage Labels (The "Real Data" Check)
        # This places the exact confidence score on top of each bar
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + 2,
                    f'{height:.1f}%', ha='center', va='bottom', 
                    color='#e0aaff', fontsize=8, fontweight='bold')

        # 6. Save with Transparency and Encode
        img = io.BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight', transparent=True, dpi=100)
        plt.close()

        plot_url = base64.b64encode(img.getvalue()).decode('utf-8')
        return plot_url