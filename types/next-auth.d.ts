// Extend NextAuth types to include our custom fields
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id:          string;
      name:        string;
      email:       string;
      image?:      string | null;
      roleId:      string;
      roleName:    string;
      permissions: string[]; // ["project:read:own", "project:create:own", ...]
    };
  }

  interface User {
    id?:      string;
    roleId?:  string;
    roleName?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:          string;
    roleId:      string;
    roleName:    string;
    permissions: string[];
  }
}
