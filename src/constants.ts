
export const CURRICULUM = {
  GATE_DA: [
    "Calculus and Optimization (Functions, Limit, Continuity, Differentiability, Taylor series, Maxima & Minima, Single variable optimization)",
    "Probability and Statistics (Counting, Axioms, Bayes Theorem, Random Variables, PMF/PDF, Distributions: Bernoulli, Binomial, Poisson, Normal, t, Chi-squared, Central Limit Theorem, Hypothesis Testing: z-test, t-test)",
    "Linear Algebra (Vector space, Subspaces, Dependence, Matrices, Projections, LU/SVD Decomposition, Eigenvalues & Eigenvectors, Systems of equations)",
    "Programming & DSA (Python, Stacks, Queues, Linked Lists, Trees, Hash Tables, Search/Sort algorithms, Divide & Conquer, Graph algorithms)",
    "Machine Learning (Supervised: Regression, KNN, Naive Bayes, SVM, Decision Trees, MLP, Neural Networks; Unsupervised: Clustering, PCA)",
    "AI (Search: Informed/Uninformed/Adversarial, Logic, Propositional/Predicate, Reasoning under uncertainty, Inference)",
    "Database Management (ER-model, Relational Algebra, SQL, Normalization, Data Warehouse modelling, Multidimensional data models)"
  ],
  PLACEMENT: [
    "DSA: Basics & Intermediate (Sliding Window, Pattern Matching, Recursion, LL, Stack)",
    "DSA: Trees & Graphs (LCA, BST, BFS/DFS, Topo Sort, Shortest Path: Dijkstra, DSU)",
    "DSA: Advanced (DP: Knapsack/LIS/Strings, Bit Manipulation, Greedy Algorithms)",
    "OOPS: SOLID Principles, Design Patterns (Singleton, Factory, Observer), Abstraction",
    "DBMS & SQL: Normalization (BCNF), ACID, Indexing, Window Functions, Complex Joins",
    "Operating Systems: Scheduling, Deadlocks, Paging & Segmentation, Synchronization",
    "Computer Networks: HTTP/S, TCP/UDP, DNS, OSI & TCP/IP, Congestion Control",
    "Aptitude: Quant (Time & Work, Speed, Prob/P&C) & Logical (Puzzles, Blood Relations)",
    "System Design: Scalability, Load Balancing, Caching, Chat/Notification Systems",
    "HR & Behavioral: Tell me about yourself, Conflict Handling, Projects explanation"
  ],
  ML_AI: [
    "Python & Data (NumPy Vectorization, Pandas Pivot, Seaborn Visualization)",
    "Statistics for ML (Depth: Hypothesis Testing, Bayes, Confidence Intervals)",
    "Supervised Learning (Sklearn: Random Forest, SVM, ROC-AUC, Bias-Variance)",
    "Unsupervised Learning (Clustering, PCA Dimensionality Reduction)",
    "Deep Learning (PyTorch, Perceptron, Backpropagation, CNN, LSTM/GRU)",
    "NLP: MAIN AREA (Transformers, BERT, GPT, Hugging Face, Attention)",
    "Computer Vision (YOLO, ResNet, Transfer Learning Basics)",
    "Projects & Kaggle (Competitions, Feature Engineering, 2-3 Strong Projects)",
    "MLOps (FastAPI/Flask Deployment, Docker, API Creation, Model Versioning)"
  ]
};

export const INITIAL_STATS = {
  gateCoverage: 12,
  placementCoverage: 8,
  mlAiCoverage: 5,
  streak: 3,
  completedThisWeek: ["Arrays (Searching)", "Numpy Basics", "Linear Algebra Intro"],
  pendingThisWeek: ["Probability Distributions", "OOPS Concepts", "Pandas Aggregations"],
  weakAreas: ["Probability (Bayes)", "Graph Traversals"],
  rescheduleQueue: [],
  todayTasks: [
    { id: '1', name: "Limits & Continuity (Calculus)", completed: false },
    { id: '2', name: "Differentiability Basics", completed: false },
    { id: '3', name: "Placement DSA: Arrays review", completed: false }
  ],
  studyHistory: []
};
