const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Create complaint
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, category, latitude, longitude } = req.body;

    if (!title || !description || !category || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        category,
        latitude,
        longitude,
        userId: req.userId,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all complaints
router.get("/", async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get complaint by ID
router.get("/:id", async (req, res) => {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update complaint
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    const { title, description, category, status, latitude, longitude } = req.body;

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (complaint.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to update this complaint" });
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
        ...(status && { status }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete complaint
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (complaint.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this complaint" });
    }

    await prisma.complaint.delete({
      where: { id: complaintId },
    });

    res.json({ message: "Complaint deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's complaints
router.get("/user/my-complaints", authMiddleware, async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { userId: req.userId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
