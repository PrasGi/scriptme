import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { badRequest, conflict, created, serverError, validationError } from '@/lib/response';
import User from '@/models/user.model';
import Role from '@/models/role.model';
import { validateRegister } from './validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const parsed = validateRegister(body);
    if (!parsed.ok) return validationError(parsed.errors);

    const { name, email, password } = parsed.data;

    await connectDB();

    // Check duplicate email
    const existing = await User.findOne({ email }).lean();
    if (existing) return conflict('An account with this email already exists');

    // Assign default role
    const defaultRole = await Role.findOne({ isDefault: true }).lean();
    if (!defaultRole) return badRequest('Server configuration error: no default role found');

    // Create user (password hashed by pre-save hook)
    const user = await User.create({ name, email, password, roleId: defaultRole._id });

    return created('Account created successfully', {
      id:    user._id.toString(),
      name:  user.name,
      email: user.email,
    });
  } catch (err) {
    return serverError(err);
  }
}
