const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Admin analytics
router.get("/analytics", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalComplaints = await prisma.complaint.count();
    const totalUsers = await prisma.user.count();
    const pendingComplaints = await prisma.complaint.count({
      where: { status: "PENDING" },
    });
    const resolvedComplaints = await prisma.complaint.count({
      where: { status: "RESOLVED" },
    });

    const complaintsByCategory = await prisma.complaint.groupBy({
      by: ["category"],
      _count: {
        id: true,
      },
    });

    res.json({
      totalComplaints,
      totalUsers,
      pendingComplaints,
      resolvedComplaints,
      complaintsByCategory: complaintsByCategory.map((item) => ({
        category: item.category,
        count: item._count.id,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all complaints with filters
router.get("/complaints", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const complaints = await prisma.complaint.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const total = await prisma.complaint.count({ where });

    res.json({
      complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update complaint status
router.patch("/complaints/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const complaint = await prisma.complaint.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { complaints: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
