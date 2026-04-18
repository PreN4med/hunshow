export type Movie = {
  id: string;
  title: string;
  creator: string;
  createdAt?: string;
  thumbnail: string;
  videoUrl: string;
  description: string;
  likes?: number;
  likedByCurrentUser?: boolean;
};

export const mockMovies: Movie[] = [
  {
    id: "1",
    title: "Hunter Short Film: Midnight",
    creator: "Student Creator",
    createdAt: "1/1/11",
    thumbnail: "/thumbnails/midnight.jpg",
    videoUrl: "/COWS_AT_THE_GRASS.mp4",
    description: "A short student film made for a class project.",
  },
  {
    id: "2",
    title: "Campus-Mini Doc",
    creator: "Film Club",
    createdAt: "1/1/11",
    thumbnail: "/thumbnails/campus.jpg",
    videoUrl: "https://www.youtube.com/watch?v=AWmgfJRziHM",
    description:
      "A mini documentary exploring campus life and student experiences through the lens of our community.",
  },
];
