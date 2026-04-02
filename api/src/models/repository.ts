import { MongoClient } from 'mongodb';

export type RedFlag = {
  question_id: number;
  title: string;
  community_forecast: number;
  red_flag_score: number;
  why_flagged: string[];
  llm_synthesis: string;
  domain: string;
  num_forecasters: number;
  close_time?: string;
  computed_at: string;
  score_breakdown?: Record<string, number>;
};

const seededFlags: RedFlag[] = [
  {
    question_id: 1,
    title: 'Will global event X occur by date Y?',
    community_forecast: 0.84,
    red_flag_score: 78,
    why_flagged: ['Late forecast velocity is high', 'Domain has elevated overconfidence history'],
    llm_synthesis:
      'The crowd is assigning high confidence in a historically miscalibrated domain while forecasts recently shifted quickly. This pattern often indicates underpriced uncertainty before resolution.',
    domain: 'geopolitics',
    num_forecasters: 28,
    computed_at: new Date().toISOString(),
    score_breakdown: {
      domain_penalty: 28,
      forecast_velocity: 25,
      crowd_size_penalty: 12,
      high_confidence_zone: 15,
    },
  },
];

const seededCalibration = [
  {
    domain: 'geopolitics',
    brier_score: 0.27,
    calibration_curve: [],
    overconfidence_index: 0.19,
    confidence_cliff: 0.8,
    sample_size: 412,
    computed_at: new Date().toISOString(),
  },
  {
    domain: 'ai',
    brier_score: 0.18,
    calibration_curve: [],
    overconfidence_index: 0.05,
    confidence_cliff: null,
    sample_size: 550,
    computed_at: new Date().toISOString(),
  },
];

let client: MongoClient | null = null;

async function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db();
}

export async function getFlagged(limit: number, domain?: string) {
  const conn = await db();
  if (!conn) {
    const filtered = domain ? seededFlags.filter((f) => f.domain === domain) : seededFlags;
    return filtered.slice(0, limit);
  }
  const query = domain ? { domain } : {};
  return conn.collection('red_flags').find(query).sort({ red_flag_score: -1 }).limit(limit).toArray();
}

export async function getAudit(questionId: number) {
  const conn = await db();
  if (!conn) {
    const now = new Date();
    return {
      question: {
        metaculus_id: questionId,
        title: 'Will global event X occur by date Y?',
        community_prediction: 0.84,
      },
      forecast_history: Array.from({ length: 30 }).map((_, i) => ({
        question_id: questionId,
        timestamp: new Date(now.getTime() - (30 - i) * 86400000).toISOString(),
        community_prediction: 0.7 + i * 0.004,
      })),
      red_flag: seededFlags[0],
      analogs: [
        { question_id: 1001, title: 'Analog 1', community_forecast: 0.79, outcome: 0 },
        { question_id: 1002, title: 'Analog 2', community_forecast: 0.83, outcome: 1 },
        { question_id: 1003, title: 'Analog 3', community_forecast: 0.81, outcome: 0 },
      ],
    };
  }

  const [question, redFlag, analogsDoc] = await Promise.all([
    conn.collection('questions').findOne({ metaculus_id: questionId }),
    conn.collection('red_flags').findOne({ question_id: questionId }),
    conn.collection('analogs').findOne({ question_id: questionId }),
  ]);

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const forecastHistory = await conn
    .collection('forecast_history')
    .find({ question_id: questionId, timestamp: { $gte: since } })
    .sort({ timestamp: 1 })
    .toArray();

  return { question, forecast_history: forecastHistory, red_flag: redFlag, analogs: analogsDoc?.matches ?? [] };
}

export async function getForecastHistory(questionId: number) {
  const conn = await db();
  if (!conn) {
    return Array.from({ length: 30 }).map((_, i) => ({
      question_id: questionId,
      timestamp: new Date(Date.now() - (30 - i) * 86400000).toISOString(),
      community_prediction: 0.6 + i * 0.01,
    }));
  }
  return conn.collection('forecast_history').find({ question_id: questionId }).sort({ timestamp: 1 }).toArray();
}

export async function getDomainCalibration() {
  const conn = await db();
  if (!conn) {
    return [...seededCalibration].sort((a, b) => b.overconfidence_index - a.overconfidence_index);
  }
  return conn.collection('calibration_scores').find({}).sort({ overconfidence_index: -1 }).toArray();
}

export async function getDomainBlindSpots(domain: string) {
  const conn = await db();
  if (!conn) {
    return [{ metaculus_id: 5001, title: 'Blind spot sample', community_prediction: 0.81, resolution: 0 }];
  }
  return conn
    .collection('questions')
    .find({
      domain_tags: domain,
      resolved: true,
      $or: [
        { community_prediction: { $gt: 0.75 }, resolution: 0 },
        { community_prediction: { $lt: 0.25 }, resolution: 1 },
      ],
    })
    .toArray();
}

export async function getForecasterBlindSpots(username: string) {
  const conn = await db();
  if (!conn) {
    return {
      username,
      domains: [
        {
          domain: 'geopolitics',
          brier_score: 0.31,
          overconfidence_index: 0.22,
          recommendation: 'Use wider probability intervals around major uncertainty.',
        },
      ],
    };
  }
  return (await conn.collection('forecaster_scores').findOne({ username })) ?? { username, domains: [] };
}
