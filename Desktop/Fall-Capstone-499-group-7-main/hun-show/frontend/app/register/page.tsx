"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";

export default function RegisterPage() {
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const { name, value } = event.target;
    setValues((values) => ({
      ...values,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    // Basic validation
    if (!values.firstName || !values.lastName || !values.email || !values.password) {
      setSubmitted(true);
      return;
    }

    setLoading(true);

    try {
      // Send registration data to the backend
      const response = await fetch("http://localhost:5000/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Registration successful
      setValid(true);
      setSubmitted(true);
    } catch (err) {
      setError("Could not connect to the server. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="form-container">
      <form className="register-form" onSubmit={handleSubmit}>
        {/* Success message */}
        {submitted && valid && (
          <div className="success-message">
            <h3>Welcome {values.firstName} {values.lastName}!</h3>
            <div>Your registration was successful!</div>
          </div>
        )}

        {/* Error message */}
        {error && <span style={{ color: "red" }}>{error}</span>}

        {!valid && (
          <>
            <input
              type="text"
              placeholder="First Name"
              name="firstName"
              value={values.firstName}
              onChange={handleInputChange}
            />
            {submitted && !values.firstName && (
              <span id="first-name-error">Please enter a first name</span>
            )}

            <input
              type="text"
              placeholder="Last Name"
              name="lastName"
              value={values.lastName}
              onChange={handleInputChange}
            />
            {submitted && !values.lastName && (
              <span id="last-name-error">Please enter a last name</span>
            )}

            <input
              type="email"
              placeholder="Email"
              name="email"
              value={values.email}
              onChange={handleInputChange}
            />
            {submitted && !values.email && (
              <span id="email-error">Please enter an email address</span>
            )}

            <input
              type="password"
              placeholder="Password"
              name="password"
              value={values.password}
              onChange={handleInputChange}
            />
            {submitted && !values.password && (
              <span id="password-error">Please enter a password</span>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
