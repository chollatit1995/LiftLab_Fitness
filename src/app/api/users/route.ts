import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "@/lib/db/users";
import { AppUserRole } from "@/lib/user-types";

function generateUserId() {
  return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users failed:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password, name, role, status } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    const user = await createUser({
      id: generateUserId(),
      email,
      password,
      name,
      role: role as AppUserRole,
      status: status ?? "active",
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/users failed:", error);
    const message = String(error);
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json(
        { error: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, email, password, name, role, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const user = await updateUser(id, {
      email,
      password: password || undefined,
      name,
      role: role as AppUserRole,
      status,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT /api/users failed:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    if (id === session.id) {
      return NextResponse.json(
        { error: "ไม่สามารถลบบัญชีของตัวเองได้" },
        { status: 400 }
      );
    }

    const deleted = await deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/users failed:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
