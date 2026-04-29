import Link from "next/link";
import Header from "@/components/Header";

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="confirmIconSvg"
    >
      <path
        d="M4.5 7.5C4.5 6.4 5.4 5.5 6.5 5.5H17.5C18.6 5.5 19.5 6.4 19.5 7.5V16.5C19.5 17.6 18.6 18.5 17.5 18.5H6.5C5.4 18.5 4.5 17.6 4.5 16.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 7L12 12.25L18.5 7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="authInlineIcon"
    >
      <path
        d="M5 12H19M19 12L13 6M19 12L13 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ConfirmPage() {
  return (
    <>
      <Header page="home" />

      <main className="container authPage">
        <section className="authShell">
          <div className="authCard confirmCard">
            <div className="confirmIconWrap">
              <MailIcon />
            </div>

            <div className="authHeader confirmHeader">
              <p className="authEyebrow">Almost there</p>

              <h1 className="authTitle">Check your email</h1>

              <p className="authSubtitle">
                We sent you a confirmation link. Click it to activate your
                account, then come back and log in.
              </p>
            </div>

            <div className="confirmInfoBox">
              <p className="confirmInfoTitle">Next step</p>
              <p className="confirmInfoText">
                Open your inbox and look for the HunShow confirmation email. It
                may take a minute to arrive.
              </p>
            </div>

            <div className="authActions confirmActions">
              <Link href="/login" className="btn btnPrimary authSubmitBtn">
                <span>Go to Login</span>
                <ArrowRightIcon />
              </Link>

              <Link href="/" className="btn btnGhost authSecondaryBtn">
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}