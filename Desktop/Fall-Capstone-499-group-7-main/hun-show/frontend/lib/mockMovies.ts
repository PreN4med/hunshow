export type Movie = {
  id: string;
  title: string;
  creator: string;
  year?: number;
  thumbnail: string;
  videoUrl: string;   
  description: string;
};

export const mockMovies: Movie[] = [
  {
    id: "1",
    title: "Hunter Short Film: Midnight",
    creator: "Student Creator",
    year: 2026,
    thumbnail: "/thumbnails/midnight.jpg",
    videoUrl: "/videos/sample.mp4",
    description: "A short student film made for a class project.",
  },
  {
    id: "2",
    title: "Campus Life Mini-Doc",
    creator: "Film Club",
    year: 2026,
    thumbnail: "/thumbnails/campus.jpg",
    videoUrl: "/videos/sample.mp4",
    description: "A mini documentary around campus life.",
  },
];