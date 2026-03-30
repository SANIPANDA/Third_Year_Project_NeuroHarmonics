import mne
import numpy as np
import pandas as pd
import os

def extract_features_from_raw(file_path, label):
    # Load raw data (Adjust based on your file type)
    if file_path.endswith('.edf'):
        raw = mne.io.read_raw_edf(file_path, preload=True)
    else:
        df = pd.read_csv(file_path)
        # Assuming 256Hz sampling rate - change if yours is different!
        info = mne.create_info(ch_names=list(df.columns), sfreq=256, ch_types='eeg')
        raw = mne.io.RawArray(df.values.T, info)

    # Apply your algorithm's filters
    raw.filter(l_freq=0.5, h_freq=50.0)
    
    # Compute Power Spectral Density (PSD)
    psds, freqs = mne.time_frequency.psd_array_welch(
        raw.get_data(), sfreq=raw.info['sfreq'], fmin=0.5, fmax=50.0
    )
    
    # Extract Band Powers (Step 6 of your algorithm)
    bands = {'Delta': (0.5, 4), 'Theta': (4, 8), 'Alpha': (8, 13), 'Beta': (13, 30), 'Gamma': (30, 50)}
    features = {}
    for band, (fmin, fmax) in bands.items():
        idx = np.logical_and(freqs >= fmin, freqs <= fmax)
        features[band] = psds[:, idx].mean() # Average across channels and frequencies
    
    features['Emotion'] = label
    return features

# Example: Process a folder of "Happy" files and "Sad" files
# data_list = []
# data_list.append(extract_features_from_raw('happy_user1.csv', 'Happy'))
# data_list.append(extract_features_from_raw('sad_user1.csv', 'Sad'))
# pd.DataFrame(data_list).to_csv('processed_eeg_features.csv', index=False)