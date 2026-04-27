
export interface Topic {
  id: string;
  name: string;
  duration: string;
  resources: { name: string; url: string }[];
  status: 'not_started' | 'completed';
}

export interface Phase {
  name: string;
  topics: Topic[];
}

export interface Roadmap {
  id: string;
  title: string;
  phases: Phase[];
}

export interface DailyTopic extends Topic {
  date: string;
  completedAt?: string;
}

export interface Project {
  id: string;
  week: number;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'Not Started' | 'In Progress' | 'Completed';
  hours: number;
  description: string;
}

export interface AppState {
  activeRoadmapId: string;
  roadmaps: Roadmap[];
  streak: number;
  lastVisit: string;
  dailyPlan: DailyTopic[];
  projects: Project[];
  isDarkMode: boolean;
}
