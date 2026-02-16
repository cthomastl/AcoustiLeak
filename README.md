# AcoustiLeak - Pipeline Gas Leak Detection

A full-stack microservices application that uses low-cost microphones attached to pipelines to detect methane gas leaks. The system listens for high-frequency "hiss" signatures of escaping gas and filters out environmental noise (wind, machinery, birds) to alert operators to micro-leaks.

## Architecture

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  API Gateway   │────▶│ Audio Processor   │
│  (React)     │     │  (Flask:5000)  │     │ (Flask:5001)      │
│  port 3000   │     │                │     │ FFT analysis,     │
└─────────────┘     │                │     │ noise filtering   │
                     │                │     └──────────────────┘
                     │                │
                     │                │────▶┌──────────────────┐
                     │                │     │  Alert Service    │
                     └───────┬────────┘     │  (Flask:5002)    │
                             │              └──────────────────┘
                             │
                     ┌───────▼────────┐
                     │  MySQL     │
                     │  (AWS RDS)      │
                     └────────────────┘
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | 3000 | React dashboard for operators |
| **API Gateway** | 5000 | Main REST API, routes requests to services |
| **Audio Processor** | 5001 | FFT-based audio analysis, leak classification |
| **Alert Service** | 5002 | Alert creation, acknowledgement, resolution |

### How Leak Detection Works

1. Microphones capture audio from pipeline surfaces
2. Audio is sent to the Audio Processor service
3. FFT analysis breaks the signal into frequency bands:
   - **Wind**: 20–500 Hz (filtered out)
   - **Machinery**: 100–2,000 Hz (filtered out)
   - **Bird noise**: 1,000–8,000 Hz (filtered out)
   - **Gas leak hiss**: 10,000–22,000 Hz (target signal)
4. If gas-leak band energy exceeds threshold (>60% confidence), an alert is created
5. Operators see alerts on the dashboard and can acknowledge/resolve them

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Access to the AWS RDS MySQL instance

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 2. Initialize the Database

Create the database and run the schema against your RDS instance:

```bash
# Create the database
mysql -h sql-db-1.ccdgyuq2ejgs.us-east-1.rds.amazonaws.com \
      -u admin -p \
      -e "CREATE DATABASE IF NOT EXISTS acoustileak;"

# Run the schema
mysql -h sql-db-1.ccdgyuq2ejgs.us-east-1.rds.amazonaws.com \
      -u admin -p acoustileak \
      < database/schema.sql
```

### 3. Start All Services

```bash
docker-compose up --build
```

This starts:
- Frontend at http://localhost:3000
- API Gateway at http://localhost:5000
- Audio Processor at http://localhost:5001
- Alert Service at http://localhost:5002

### 4. Test the System

Open http://localhost:3000 and go to the **Simulate** tab. Select a sensor and scenario (e.g., "Gas Leak") and click **Run Analysis**. You'll see the frequency analysis and any generated alerts.

## API Endpoints

### API Gateway (port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Aggregated dashboard data |
| GET | `/api/sensors` | List all sensors |
| POST | `/api/sensors` | Create a sensor |
| PUT | `/api/sensors/:id` | Update a sensor |
| GET | `/api/readings` | Get audio readings |
| POST | `/api/readings/analyze` | Submit audio for analysis |
| GET | `/api/alerts` | Get alerts (filterable) |
| PUT | `/api/alerts/:id/acknowledge` | Acknowledge an alert |

### Audio Processor (port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/process` | Analyze audio data |
| POST | `/simulate` | Generate & analyze simulated audio |

### Alert Service (port 5002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts` | Get alerts with filters |
| POST | `/alerts` | Create an alert |
| PUT | `/alerts/:id/acknowledge` | Acknowledge alert |
| PUT | `/alerts/:id/resolve` | Resolve alert |
| GET | `/alerts/stats` | Alert statistics |

## Project Structure

```
AcoustiLeak/
├── docker-compose.yml
├── .env.example
├── database/
│   └── schema.sql              # MySQL schema + seed data (RDS)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.js              # Main app with tab navigation
│       ├── App.css             # Dark theme styles
│       ├── pages/
│       │   ├── Dashboard.js    # Overview with stats & recent leaks
│       │   ├── Sensors.js      # Sensor management table
│       │   ├── Alerts.js       # Alert list with filtering
│       │   └── Simulate.js     # Audio simulation & analysis
│       └── services/
│           └── api.js          # API client
└── services/
    ├── api-gateway/
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app.py              # REST API + service orchestration
    ├── audio-processor/
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app.py              # FFT analysis + noise classification
    └── alert-service/
        ├── Dockerfile
        ├── requirements.txt
        └── app.py              # Alert CRUD + severity mapping
```
