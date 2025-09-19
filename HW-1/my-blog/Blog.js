"use strict";

// 5. Closure to track successful submissions
const submissionCounter = (() => {
  let count = 0;
  return () => ++count;
})();

// 1. Arrow function to validate the form
const validateForm = () => {
  const blogcontent = document.getElementById("blogContent").value.trim();
  const termscheckbox = document.getElementById("terms").checked;

  // 1a. Blog content length check
  if (blogcontent.length <= 25) {
    alert("Blog content should be more than 25 characters");
    return false;
  }

  // 1b. Terms checkbox check
  if (!termscheckbox) {
    alert("You must agree to the terms and conditions");
    return false;
  }

  return true;
};

// Add submit listener
document.getElementById("blogForm").addEventListener("submit", (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  // 2. Gather form data
  const data = {
    blogTitle: document.getElementById("blogTitle").value,
    authorName: document.getElementById("authorName").value,
    email: document.getElementById("email").value,
    blogContent: document.getElementById("blogContent").value,
    category: document.getElementById("category").value,
    terms: document.getElementById("terms").checked,
  };

  // Convert to JSON string and log
  const jsonString = JSON.stringify(data);
  console.log("JSON string:", jsonString);

  // Parse back into object
  const parsed = JSON.parse(jsonString);

  // 3. Destructuring
  const { blogTitle: title, email } = parsed;
  console.log("Title:", title);
  console.log("Email:", email);

  // 4. Spread operator
  const updated = { ...parsed, submissionDate: new Date().toISOString() };
  console.log("Updated object with submissionDate:", updated);

  // 5. Closure in action
  const count = submissionCounter();
  console.log(`Successful submissions: ${count}`);

  alert("Form submitted successfully!");
  e.target.reset();
  document.getElementById("blogTitle").focus();
});
