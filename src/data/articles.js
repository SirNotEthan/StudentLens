export const featuredArticles = [
  {
    id: 1,
    title: "Welcome to the New Student Lens Platform",
    category: "ANNOUNCEMENT",
    author: "Student Lens Team",
    date: "2024-01-15",
    image: "/images/featured-welcome.jpg",
    excerpt: "Discover the new features and improvements we've made to enhance your Student Lens experience.",
    featured: true
  },
  {
    id: 2,
    title: "Campus Events This Week",
    category: "EVENTS",
    author: "Events Team",
    date: "2024-01-14",
    image: "/images/campus-events.jpg",
    excerpt: "Don't miss out on these exciting campus events happening this week."
  },
  {
    id: 3,
    title: "New Study Groups Available",
    category: "ACADEMIC",
    author: "Academic Support",
    date: "2024-01-13",
    image: "/images/study-groups.jpg",
    excerpt: "Join study groups for various subjects and improve your academic performance."
  }
];

export const newsArticles = [
  {
    id: 4,
    title: "Fall Semester Registration Opens",
    category: "ACADEMIC",
    author: "Registration Office",
    date: "2024-01-12",
    image: "/images/registration.jpg",
    excerpt: "Early registration for fall semester begins next Monday. Don't wait to secure your spot!"
  },
  {
    id: 5,
    title: "Basketball Team Wins Championship",
    category: "SPORTS",
    author: "Sports Desk",
    date: "2024-01-11",
    image: "/images/basketball-win.jpg",
    excerpt: "Our basketball team brought home the state championship after an intense final game."
  },
  {
    id: 6,
    title: "Science Fair Submissions Due",
    category: "ACADEMIC",
    author: "Science Department",
    date: "2024-01-10",
    image: "/images/science-fair.jpg",
    excerpt: "Submit your science fair projects by Friday to participate in this year's competition."
  },
  {
    id: 7,
    title: "Spring Concert Ticket Sales",
    category: "EVENTS",
    author: "Music Department",
    date: "2024-01-09",
    image: "/images/spring-concert.jpg",
    excerpt: "Get your tickets now for the annual spring concert featuring student performances."
  },
  {
    id: 8,
    title: "Debate Club Takes First Place",
    category: "CLUBS",
    author: "Debate Club",
    date: "2024-01-08",
    image: "/images/debate-win.jpg",
    excerpt: "Our debate team dominated the regional competition with outstanding arguments."
  },
  {
    id: 9,
    title: "New Library Hours Announced",
    category: "ANNOUNCEMENTS",
    author: "Library Staff",
    date: "2024-01-07",
    image: "/images/library-hours.jpg",
    excerpt: "The library will extend its hours during finals week to better serve students."
  },
  {
    id: 10,
    title: "Student Government Elections",
    category: "ANNOUNCEMENTS",
    author: "Student Government",
    date: "2024-01-06",
    image: "/images/elections.jpg",
    excerpt: "Voting for student government positions opens next week. Make your voice heard!"
  },
  {
    id: 11,
    title: "Chemistry Lab Safety Updates",
    category: "ACADEMIC",
    author: "Safety Committee",
    date: "2024-01-05",
    image: "/images/lab-safety.jpg",
    excerpt: "Important updates to lab safety protocols. All chemistry students must attend the briefing."
  },
  {
    id: 12,
    title: "Track Team Sets New Record",
    category: "SPORTS",
    author: "Athletics Department",
    date: "2024-01-04",
    image: "/images/track-record.jpg",
    excerpt: "Sarah Johnson breaks the school record in the 400m dash at yesterday's meet."
  },
  {
    id: 13,
    title: "Drama Club Auditions Open",
    category: "CLUBS",
    author: "Drama Club",
    date: "2024-01-03",
    image: "/images/drama-auditions.jpg",
    excerpt: "Auditions for the spring play are now open. All students welcome to try out!"
  },
  {
    id: 14,
    title: "Career Fair Next Month",
    category: "EVENTS",
    author: "Career Services",
    date: "2024-01-02",
    image: "/images/career-fair.jpg",
    excerpt: "Meet with potential employers and learn about internship opportunities."
  },
  {
    id: 15,
    title: "Chess Club Tournament Winners",
    category: "CLUBS",
    author: "Chess Club",
    date: "2024-01-01",
    image: "/images/chess-tournament.jpg",
    excerpt: "Congratulations to our chess tournament winners and all participants!"
  },
  {
    id: 16,
    title: "Environmental Club Earth Day Planning",
    category: "CLUBS",
    author: "Environmental Club",
    date: "2023-12-31",
    image: "/images/earth-day.jpg",
    excerpt: "Join us in planning this year's Earth Day celebration and environmental awareness events."
  },
  {
    id: 17,
    title: "Winter Sports Highlights",
    category: "SPORTS",
    author: "Sports Desk",
    date: "2023-12-30",
    image: "/images/winter-sports.jpg",
    excerpt: "A recap of our winter sports teams' outstanding performances this season."
  },
  {
    id: 18,
    title: "Student Art Exhibition Opening",
    category: "EVENTS",
    author: "Art Department",
    date: "2023-12-29",
    image: "/images/art-exhibition.jpg",
    excerpt: "Come view the incredible artwork created by our talented student artists."
  },
  {
    id: 19,
    title: "Math Competition Results",
    category: "ACADEMIC",
    author: "Math Department",
    date: "2023-12-28",
    image: "/images/math-competition.jpg",
    excerpt: "Our math team excelled at the state competition, bringing home multiple awards."
  }
];

export const categories = [
  { name: "ALL", color: "red", active: true },
  { name: "ACADEMIC", color: "blue" },
  { name: "SPORTS", color: "green" },
  { name: "EVENTS", color: "orange" },
  { name: "CLUBS", color: "green" },
  { name: "ANNOUNCEMENTS", color: "yellow" }
];

export const getCategoryColor = (category) => {
  const categoryColors = {
    "ACADEMIC": "blue",
    "SPORTS": "green",
    "EVENTS": "orange",
    "CLUBS": "green",
    "ANNOUNCEMENTS": "yellow",
    "ANNOUNCEMENT": "yellow"
  };
  return categoryColors[category] || "red";
};

export const getArticlesByCategory = (category) => {
  if (category === "ALL") {
    return [...featuredArticles, ...newsArticles];
  }
  return [...featuredArticles, ...newsArticles].filter(article =>
    article.category === category
  );
};

export const getRecentArticles = (limit = 3) => {
  return [...featuredArticles, ...newsArticles]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};