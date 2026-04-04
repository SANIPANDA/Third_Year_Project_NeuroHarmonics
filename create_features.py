import pandas as pd
import numpy as np
import os
from processor import EEGProcessor

def generate_processed_data():
    print("🚀 Starting Feature Extraction Pipeline...")
    
    # Initialize your actual processor logic
    processor = EEGProcessor()
    
    # Define which files correspond to which emotions
    # This matches the filenames from your generators
    categories = {
        'Happy': 'data/happy',
        'Sad': 'data/sad',
        'Tired': 'data/tired',
        'Angry': 'data/angry'
    }

    all_features = []

    for emotion, prefix in categories.items():
        print(f"Processing {emotion} files...")
        
        # Loop through the 10 files we generated for each emotion
        for i in range(1, 11):
            file_path = f"{prefix}{i}.csv"
            
            if os.path.exists(file_path):
                # Use the REAL processing logic (Filtering -> ICA -> PSD)
                try:
                    features = processor.process_signal(file_path)
                    
                    if features is not None:
                        # Add each windowed segment as a row in our dataset
                        for row in features:
                            # Combine features with the emotion label
                            feature_row = list(row) + [emotion]
                            all_features.append(feature_row)
                except Exception as e:
                    print(f"⚠️ Error processing {file_path}: {e}")
            else:
                print(f"❓ Missing file: {file_path}")

    # Create the DataFrame with correct column names
    columns = ['Delta', 'Theta', 'Alpha', 'Beta', 'Gamma', 'Emotion']
    df = pd.DataFrame(all_features, columns=columns)
    
    if not df.empty:
        # Save the master feature set
        df.to_csv('processed_eeg_features.csv', index=False)
        print(f"✅ Success! Generated 'processed_eeg_features.csv' with {len(df)} samples.")
    else:
        print("❌ Error: No features were extracted. Check your 'data/' folder.")

if __name__ == "__main__":
    generate_processed_data()