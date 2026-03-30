import pandas as pd
import numpy as np
import os

# This script generates the 'processed_eeg_features.csv' file 
# that your train_model.py is looking for.

def generate_processed_data():
    print("Generating feature dataset...")
    
    # We are creating 200 samples of 'processed' data
    # In a real scenario, this would come from your .edf/.csv raw files
    data = {
        'Delta': np.random.uniform(0.5, 20.0, 200),
        'Theta': np.random.uniform(0.5, 15.0, 200),
        'Alpha': np.random.uniform(1.0, 30.0, 200),
        'Beta': np.random.uniform(1.0, 25.0, 200),
        'Gamma': np.random.uniform(0.1, 10.0, 200),
        'Emotion': np.random.choice(['Angry', 'Sad', 'Tired', 'Happy'], 200)
    }

    df = pd.DataFrame(data)
    
    # This creates the file your error was complaining about!
    df.to_csv('processed_eeg_features.csv', index=False)
    print("Done! 'processed_eeg_features.csv' created.")

if __name__ == "__main__":
    generate_processed_data()