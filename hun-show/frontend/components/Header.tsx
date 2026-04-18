"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface HeaderProps {
  page?: string;
}

export default function Header({ page = "other" }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const prevScrollY = useRef(0);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in by checking localStorage
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (e) {
        setIsLoggedIn(false);
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
    router.push("/");
  };

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

  return (
    <div className={`topbar${showHeader ? "" : " hidden"}`}>
      <div className="container">
        <div className="nav">
          <Link href="/" className="brand" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="logoBox" aria-label="Hun-Show logo">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M9 7.5v9l8-4.5-8-4.5z" fill="white" />
              </svg>
            </div>
            <div>
              <div className="brandTitle">Hun-Show</div>
              <div className="brandSub">Hunter-only movie sharing</div>
            </div>
          </Link>

          <div className="actions">
            {!loading && (
              <>
                {isLoggedIn && user ? (
                  <>
                    {page === "home" && (
                      <>
                        <Link
                          className="btn btnGhost"
                          href="/account"
                          style={{ minWidth: 90 }}
                        >
                          Account
                        </Link>
                        <Link
                          className="btn btnPrimary"
                          href="/upload"
                          style={{ minWidth: 90 }}
                        >
                          Upload
                        </Link>
                      </>
                    )}
                    {page === "account" && (
                      <>
                        <Link
                          className="btn btnGhost"
                          href="/"
                          style={{ minWidth: 90 }}
                        >
                          Home
                        </Link>
                        <Link
                          className="btn btnPrimary"
                          href="/upload"
                          style={{ minWidth: 90 }}
                        >
                          Upload
                        </Link>
                      </>
                    )}
                    {page !== "home" && page !== "account" && (
                      <>
                        <Link
                          className="btn btnGhost"
                          href="/account"
                          style={{ minWidth: 90 }}
                        >
                          Account
                        </Link>
                        <Link
                          className="btn btnPrimary"
                          href="/upload"
                          style={{ minWidth: 90 }}
                        >
                          Upload
                        </Link>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      className="btn btnGhost"
                      href="/login"
                      style={{ minWidth: 90 }}
                    >
                      Login
                    </Link>
                    <Link
                      className="btn btnPrimary"
                      href="/upload"
                      style={{ minWidth: 90 }}
                    >
                      Upload
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
