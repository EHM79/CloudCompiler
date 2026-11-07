import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { signToken, getCookieOptions, verifyToken } from "../utils/jwt.js";
import { connectDB } from "../config/db.js";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export async function register(req, res) {
  await connectDB();
  const { username, email, password } = req.body ?? {};

  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return res.status(400).json({ error: "Username is required (at least 2 characters)" });
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();

  try {
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
    });

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    res.cookie("token", token, getCookieOptions());

    res.status(201).json({
      message: "Registered successfully",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
}

export async function login(req, res) {
  await connectDB();
  const { email, password } = req.body ?? {};

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password is required" });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    res.cookie("token", token, getCookieOptions());

    res.json({
      message: "Logged in successfully",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: `Login failed: ${err.message}` });
  }
}

export async function getProfile(req, res) {
  let token = req.cookies?.token || req.cookies?.cloudcode_token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.json({ user: null });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.json({ user: null });
    }

    await connectDB();
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.json({ user: null });
    }

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isLoggedIn: true,
      },
    });
  } catch (err) {
    return res.json({ user: null });
  }
}

export function logout(req, res) {
  res.clearCookie("token", {
    ...getCookieOptions(),
    maxAge: 0,
  });

  res.json({
    success: true,
    message: "Logged out successfully",
    user: null,
  });
}
