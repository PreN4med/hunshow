"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

interface HeaderProps {
  page?: string;
}

function GoLiveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="headerMobileNavIcon"
    >
      <rect
        x="4"
        y="6"
        width="12"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 10L20 7.5V16.5L16 14V10Z"
        fill="currentColor"
      />
      <circle cx="8.2" cy="10" r="1.3" fill="currentColor" />
    </svg>
  );
}

function getUserInitials(user: User | null) {
  if (!user) return "U";

  const fullName =
    user.name?.trim() ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim();

  if (fullName) {
    const parts = fullName.split(" ").filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }

  return "U";
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="headerMenuIcon"
    >
      <path
        d="M4 7H20M4 12H20M4 17H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="headerMenuIcon"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="headerMobileNavIcon"
    >
      <path
        d="M5 10.5L12 5L19 10.5V18C19 18.55 18.55 19 18 19H14V13H10V19H6C5.45 19 5 18.55 5 18V10.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="headerMobileNavIcon"
    >
      <path d="M12 20.5L10.55 19.18C5.4 14.5 2 11.41 2 7.61C2 4.52 4.42 2.1 7.51 2.1C9.24 2.1 10.91 2.91 12 4.19C13.09 2.91 14.76 2.1 16.49 2.1C19.58 2.1 22 4.52 22 7.61C22 11.41 18.6 14.5 13.45 19.19L12 20.5Z" />
    </svg>
  );
}

function StreamingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="headerMobileNavIcon"
    >
      <path
        d="M12 15.5A1.5 1.5 0 1 0 12 18.5A1.5 1.5 0 1 0 12 15.5Z"
        fill="currentColor"
      />
      <path
        d="M8.5 12.5C10.43 10.57 13.57 10.57 15.5 12.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M5.5 9.5C9.09 5.91 14.91 5.91 18.5 9.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="headerMobileNavIcon"
    >
      <path
        d="M7 18.5L4.5 20V7.5C4.5 5.84 5.84 4.5 7.5 4.5H16.5C18.16 4.5 19.5 5.84 19.5 7.5V12.5C19.5 14.16 18.16 15.5 16.5 15.5H9.5L7 18.5Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path
        d="M7 18.5L4.5 20V7.5C4.5 5.84 5.84 4.5 7.5 4.5H16.5C18.16 4.5 19.5 5.84 19.5 7.5V12.5C19.5 14.16 18.16 15.5 16.5 15.5H9.5L7 18.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="headerMobileNavIcon"
    >
      <path
        d="M12 12C14.49 12 16.5 9.99 16.5 7.5C16.5 5.01 14.49 3 12 3C9.51 3 7.5 5.01 7.5 7.5C7.5 9.99 9.51 12 12 12Z"
        fill="currentColor"
      />
      <path
        d="M4 20C4.85 16.9 7.95 14.75 12 14.75C16.05 14.75 19.15 16.9 20 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="headerMobileNavIcon"
    >
      <path
        d="M12 16V5M12 5L7.5 9.5M12 5L16.5 9.5M5 19H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header({ page = "other" }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const prevScrollY = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
        setUser(null);
      }
    } else {
      setIsLoggedIn(false);
      setUser(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 60) {
        setShowHeader(true);
      } else if (currentScrollY > prevScrollY.current + 10) {
        setShowHeader(false);
      } else if (currentScrollY < prevScrollY.current - 10) {
        setShowHeader(true);
      }

      prevScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const authLabel = isLoggedIn ? "Account" : "Log In";
  const authHref = isLoggedIn ? "/account" : "/login";

  return (
    <div className={`topbar${showHeader ? "" : " hidden"}`}>
      <div className="container">
        <div className="nav headerNav">
          <Link href="/" className="brand headerBrand">
            <Image
              src="/thumbnails/hunshow_resized.png"
              alt="Hun-Show"
              width={180}
              height={44}
              priority
              className="headerLogo"
            />
          </Link>

          <div className="headerCenterText">
            Discover Student Films and Creative work
          </div>

          <div className="actions headerActions">
            {!loading && (
              <>
                <div className="headerDesktopActions">
                  {isLoggedIn && user ? (
                    <>
                      <Link
                        href="/account"
                        className="userInitialsBtn"
                        aria-label="Account"
                        title="Account"
                      >
                        {getUserInitials(user)}
                      </Link>

                      <Link
                        className="btn headerGoLiveBtn"
                        href="/stream/broadcast"
                      >
                        Go Live
                      </Link>

                      <Link
                        className="btn btnPrimary headerUploadBtn"
                        href="/upload"
                      >
                        Upload
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        className="btn btnGhost headerAccountBtn"
                        href="/login"
                      >
                        Log In
                      </Link>

                      <Link
                        className="btn btnPrimary headerUploadBtn"
                        href="/upload"
                      >
                        Upload
                      </Link>
                    </>
                  )}
                </div>

                <div className="headerMobileQuickAction">
                  {isLoggedIn && user ? (
                    <Link
                      href="/account"
                      className="userInitialsBtn headerMobileInitialsBtn"
                      aria-label="Account"
                      title="Account"
                    >
                      {getUserInitials(user)}
                    </Link>
                  ) : (
                    <Link
                      className="btn btnGhost headerMobileLoginBtn"
                      href="/login"
                    >
                      Log In
                    </Link>
                  )}
                </div>
              </>
            )}

            <button
              type="button"
              className="headerMenuBtn"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`headerMobileOverlay${mobileMenuOpen ? " isOpen" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <div className={`headerMobileDrawer${mobileMenuOpen ? " isOpen" : ""}`}>
        <div className="headerMobileDrawerInner">
          <nav className="headerMobileNav">
            <Link href="/" className="headerMobileNavItem">
              <HomeIcon />
              <span>Home</span>
            </Link>

            <Link href={authHref} className="headerMobileNavItem">
              <UserIcon />
              <span>{authLabel}</span>
            </Link>

            <Link
              href="/stream/broadcast"
              className="headerMobileNavItem headerMobileGoLiveItem"
            >
              <GoLiveIcon />
              <span>Go Live</span>
            </Link>

            <Link href="/upload" className="headerMobileNavItem">
              <UploadIcon />
              <span>Upload</span>
            </Link>

            <Link href="/liked" className="headerMobileNavItem">
              <HeartIcon />
              <span>Liked Videos</span>
            </Link>

            <Link href="/stream" className="headerMobileNavItem">
              <StreamingIcon />
              <span>Streaming</span>
            </Link>

            <Link href="/" className="headerMobileNavItem">
              <QaIcon />
              <span>Q&amp;A</span>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}