import bcrypt from "bcryptjs";
import { AuthUtils } from "../auth/auth.utils";
import Organization from "../organization/organization.model";
import OrganizationAdmin from "../organizationAdmin/organizationAdmin.model";
import DeliveryUser, { IDeliveryUser } from "./delivery.model";

export interface CreateDeliveryUserData {
  name: string;
  email: string;
  password: string;
  organizationId: string;
  phone: string;
  vehicleType: string;
  licenseNumber: string;
  createdBy: string;
}

export interface UpdateDeliveryUserData {
  name?: string;
  email?: string;
  phone?: string;
  vehicleType?: string;
  licenseNumber?: string;
  status?: "active" | "inactive" | "suspended";
}

export interface DeliveryUserFilters {
  status?: string;
  vehicleType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DeliveryUserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byVehicleType: Record<string, number>;
}

class DeliveryUserService {
  // Create a new delivery user
  async createDeliveryUser(
    data: CreateDeliveryUserData
  ): Promise<IDeliveryUser> {
    const {
      name,
      email,
      password,
      organizationId,
      phone,
      vehicleType,
      licenseNumber,
      createdBy,
    } = data;

    // Validate password strength
    const passwordValidation = AuthUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`
      );
    }

    // Check if email already exists
    const existingUser = await DeliveryUser.findOne({ email });
    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Verify organization exists and is active
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Verify the creator (organization admin) exists and belongs to the same organization
    const creator = await OrganizationAdmin.findById(createdBy);
    if (!creator) {
      throw new Error("Creator not found");
    }

    if (creator.organizationId.toString() !== organizationId) {
      throw new Error("Creator does not belong to the specified organization");
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create delivery user
    const deliveryUser = new DeliveryUser({
      name,
      email,
      password: hashedPassword,
      organizationId,
      phone,
      vehicleType,
      licenseNumber,
      createdBy,
      status: "active",
    });

    return await deliveryUser.save();
  }

  // Get all delivery users for an organization (with filtering and pagination)
  async getDeliveryUsersByOrganization(
    organizationId: string,
    filters: DeliveryUserFilters = {}
  ): Promise<{
    users: IDeliveryUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, vehicleType, search, page = 1, limit = 10 } = filters;

    // Build query
    const query: any = { organizationId };

    if (status) {
      query.status = status;
    }

    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { licenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [users, total] = await Promise.all([
      DeliveryUser.find(query)
        .populate("organizationId", "name companyName")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DeliveryUser.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get delivery user by ID (organization filtered)
  async getDeliveryUserById(
    userId: string,
    organizationId: string
  ): Promise<IDeliveryUser | null> {
    return await DeliveryUser.findOne({
      _id: userId,
      organizationId,
    })
      .populate("organizationId", "name companyName")
      .populate("createdBy", "name email");
  }

  // Update delivery user
  async updateDeliveryUser(
    userId: string,
    organizationId: string,
    data: UpdateDeliveryUserData
  ): Promise<IDeliveryUser | null> {
    const { email, ...updateData } = data;

    // If email is being updated, check if it already exists
    if (email) {
      const existingUser = await DeliveryUser.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new Error("Email already exists");
      }
    }

    const updatedUser = await DeliveryUser.findOneAndUpdate(
      { _id: userId, organizationId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate("organizationId", "name companyName")
      .populate("createdBy", "name email");

    return updatedUser;
  }

  // Delete delivery user
  async deleteDeliveryUser(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const result = await DeliveryUser.findOneAndDelete({
      _id: userId,
      organizationId,
    });

    return !!result;
  }

  // Update delivery user status
  async updateDeliveryUserStatus(
    userId: string,
    organizationId: string,
    status: "active" | "inactive" | "suspended"
  ): Promise<IDeliveryUser | null> {
    return await DeliveryUser.findOneAndUpdate(
      { _id: userId, organizationId },
      { status },
      { new: true, runValidators: true }
    )
      .populate("organizationId", "name companyName")
      .populate("createdBy", "name email");
  }

  // Reset delivery user password
  async resetDeliveryUserPassword(
    userId: string,
    organizationId: string,
    newPassword: string
  ): Promise<IDeliveryUser | null> {
    // Validate password strength
    const passwordValidation = AuthUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    return await DeliveryUser.findOneAndUpdate(
      { _id: userId, organizationId },
      { password: hashedPassword },
      { new: true, runValidators: true }
    )
      .populate("organizationId", "name companyName")
      .populate("createdBy", "name email");
  }

  // Get delivery user statistics for an organization
  async getDeliveryUserStats(
    organizationId: string
  ): Promise<DeliveryUserStats> {
    const [total, active, inactive, suspended, vehicleTypeStats] =
      await Promise.all([
        DeliveryUser.countDocuments({ organizationId }),
        DeliveryUser.countDocuments({ organizationId, status: "active" }),
        DeliveryUser.countDocuments({ organizationId, status: "inactive" }),
        DeliveryUser.countDocuments({ organizationId, status: "suspended" }),
        DeliveryUser.aggregate([
          {
            $match: {
              organizationId: new (require("mongoose").Types.ObjectId)(
                organizationId
              ),
            },
          },
          {
            $group: {
              _id: "$vehicleType",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const byVehicleType: Record<string, number> = {};
    vehicleTypeStats.forEach((stat) => {
      byVehicleType[stat._id] = stat.count;
    });

    return {
      total,
      active,
      inactive,
      suspended,
      byVehicleType,
    };
  }

  // Get delivery user by email (for authentication)
  async getDeliveryUserByEmail(email: string): Promise<IDeliveryUser | null> {
    return await DeliveryUser.findOne({ email }).populate(
      "organizationId",
      "name"
    );
  }

  // Update last login
  async updateLastLogin(userId: string): Promise<void> {
    await DeliveryUser.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
    });
  }

  // Check if delivery user belongs to organization
  async belongsToOrganization(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const user = await DeliveryUser.findOne({
      _id: userId,
      organizationId,
    });
    return !!user;
  }
}

export default new DeliveryUserService();
