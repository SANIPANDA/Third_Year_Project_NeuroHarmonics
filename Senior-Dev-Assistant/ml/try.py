import pandas as pd

df = pd.read_csv("data/raw/eeg_data.csv")
print(df.head())
print(df.dtypes)
