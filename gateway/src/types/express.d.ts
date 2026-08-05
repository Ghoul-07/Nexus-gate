import { DemoUser } from "../auth/users.js";

declare global{
  namespace Express {
    interface Request{
      user?: Omit<DemoUser, 'passwordHash'>
    }
  }
}