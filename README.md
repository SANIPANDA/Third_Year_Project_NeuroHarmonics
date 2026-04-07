# NeuroHarmonics - EEG Emotion Detection & Brain Music Therapy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/Third_Year_Project_NeuroHarmonics)

## 🎯 Features
- **Real-time EEG Analysis**: Upload .edf files → Instant emotion + brainwave detection
- **AI Music Recommendations**: Gemini-powered neuro-music therapy 
- **Facial Emotion Detection**: Live webcam emotion reading
- **Dashboard & Community**: User analytics, support tickets
- **Therapy Games**: Flappy Bird, Pacman, Space Invaders (neural training)
- **Admin Panel**: Full moderation & analytics

## 🚀 Quick Local Setup
```bash
git clone <repo>
cd Third_Year_Project_NeuroHarmonics
pip install -r requirements.txt
python app.py
```
Visit `http://localhost:5000`

**No .env required** - Uses local SQLite. AI/Supabase optional.

## ☁️ Production Deployment (No .env Sharing!)

### Render.com (Recommended - Free Tier)
1. Connect GitHub repo to [Render](https://render.com)
2. **Web Service** → Build: `pip install -r requirements.txt` → Start: `python app.py`
3. **Environment Variables** (Dashboard):
   ```
   GEMINI_API_KEY=your_key          # Optional
   SUPABASE_URL=https://...         # Optional  
   SUPABASE_KEY=your_key           # Optional
   DATABASE_URL=postgres://...     # Render provides
   ```

### Heroku
```
heroku create
heroku addons:create heroku-postgresql  # Free DB
heroku config:set GEMINI_API_KEY=your_key  # Optional
git push heroku main
```

### Railway/DigitalOcean/etc.
Same pattern: Set env vars in platform dashboard.

## 🔧 Configuration
Copy `.env.example` → `.env` and fill in your keys:

```
GEMINI_API_KEY=...     # AI features (optional)
SUPABASE_URL=...       # Cloud storage/users (optional)  
SUPABASE_KEY=...
DATABASE_URL=...       # Postgres (local SQLite default)
```

## 📁 Project Structure
```
├── app.py              # Flask app + ML inference
├── models/             # TensorFlow emotion models
├── static/             # CSS/JS/UI
├── templates/          # HTML
├── data/               # EEG datasets
├── games/              # Therapy games (Pygame)
├── requirements.txt    # Dependencies
└── .env.example        # ✅ Deploy-ready config template
```

## 🧠 ML Pipeline
1. **EEG → Features**: MNE-Python extracts 22+ brainwave features
2. **Model**: TensorFlow CNN → 4 emotions (Angry/Happy/Sad/Tired)  
3. **Output**: Emotion + Dominant Wave (Alpha/Beta/Theta/Delta) + Therapy recs

## 🔬 Sample EEG Data
Download from [this dataset](https://physionet.org/content/eegmmidb/1.0.0/) or use included samples.

## 🤖 Features Graceful Degradation
| Feature | No GEMINI_KEY | No SUPABASE |
|---------|---------------|-------------|
| EEG Analysis | ✅ Works | ✅ Works |
| Music Recs | Static tracks | ✅ Works |
| Dashboard | Basic | SQLite only |
| Webcam | ✅ Works | ✅ Works |

## 📊 Tech Stack
- **Backend**: Flask, SQLAlchemy, Supabase (Postgres)
- **ML**: TensorFlow, MNE-Python, OpenCV  
- **AI**: Google Gemini 1.5 Flash
- **Frontend**: Jinja2, vanilla JS, Canvas/WebRTC

## 🛠️ Development
```bash
pip install -r requirements.txt
python app.py  # http://localhost:5000
```

**Admin Login**: `/admin-login-page` (credentials in DB)

## 📈 Production Monitoring
- Render: Built-in metrics/logs
- Supabase: Real-time analytics dashboard
- ML Model: Local `.h5` files (no external deps)

## 🎉 Ready for Production!
✅ **No .env committed**  
✅ **SQLite fallback**  
✅ **Optional cloud services**  
✅ **One-click deploys**

*Built for your Third Year Project - Deploy anywhere! 🚀*

