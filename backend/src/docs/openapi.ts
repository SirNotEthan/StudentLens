const spec = {
  openapi: '3.0.3',
  info: {
    title: 'StudentLens API',
    version: '2.0.0',
    description: 'Backend API for the StudentLens school news platform.',
    contact: { email: 'icsnewsubmissions@icsz.ch' }
  },
  servers: [{ url: '/api', description: 'Current host' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['Student', 'Writer', 'Editor', 'Teacher', 'Owner'] },
          isActive: { type: 'boolean' },
          profileImage: { type: 'string' },
          bio: { type: 'string' },
          streak: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          excerpt: { type: 'string' },
          authorId: { type: 'string' },
          authorName: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['draft', 'pending_editor', 'pending_reviewer', 'published', 'archived'] },
          featuredImage: { type: 'string' },
          likes: { type: 'integer' },
          viewCount: { type: 'integer' },
          publishedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          postId: { type: 'string' },
          authorId: { type: 'string' },
          authorName: { type: 'string' },
          content: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          likes: { type: 'integer' },
          isDeleted: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          currentPage: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
          limit: { type: 'integer' }
        }
      }
    },
    responses: {
      Unauthorized: { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden:    { description: 'Insufficient role or permission', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound:     { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      BadRequest:   { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
    }
  },
  tags: [
    { name: 'System',       description: 'Health and meta' },
    { name: 'Auth',         description: 'Authentication and session' },
    { name: 'Users',        description: 'User management' },
    { name: 'Posts',        description: 'Article authoring and publishing' },
    { name: 'Comments',     description: 'Article comments' },
    { name: 'Applications', description: 'Writer role applications' },
    { name: 'Contact',      description: 'Contact form submissions' },
    { name: 'Settings',     description: 'Site-wide settings (Owner only)' },
    { name: 'Games',        description: 'Mini-games (Wordle, Spelling Bee, Strands, Sudoku)' }
  ],
  paths: {
    // ── System ────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Server and dependency status',
            content: { 'application/json': { schema: { type: 'object', properties: {
              status: { type: 'string', example: 'OK' },
              uptime: { type: 'number' },
              services: { type: 'object', properties: {
                appwrite: { type: 'string', enum: ['connected', 'disconnected'] },
                redis:    { type: 'string', enum: ['connected', 'not configured'] }
              }}
            }}}}
          }
        }
      }
    },

    // ── Auth ──────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username', 'email', 'password', 'firstName', 'lastName'], properties: {
          username:  { type: 'string', minLength: 3, maxLength: 50 },
          email:     { type: 'string', format: 'email' },
          password:  { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName:  { type: 'string' },
          role:      { type: 'string', enum: ['Student', 'Writer', 'Editor', 'Teacher', 'Owner'] }
        }}}}},
        responses: {
          '201': { description: 'User registered, tokens returned' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '409': { description: 'Username or email already taken' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['login', 'password'], properties: {
          login:    { type: 'string', description: 'Username or email' },
          password: { type: 'string' }
        }}}}},
        responses: {
          '200': { description: 'Tokens returned' },
          '401': { description: 'Invalid username or password' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (revokes refresh token)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logged out' },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Issue a new access token using a refresh token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: {
          refreshToken: { type: 'string' }
        }}}}},
        responses: {
          '200': { description: 'New access token returned' },
          '401': { description: 'Refresh token invalid or expired' }
        }
      }
    },
    '/auth/check-username/{username}': {
      get: {
        tags: ['Auth'],
        summary: 'Check username availability',
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: '{ available: boolean }' }
        }
      }
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password-reset email',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: {
          email: { type: 'string', format: 'email' }
        }}}}},
        responses: { '200': { description: 'Reset email sent (if account exists)' } }
      }
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token from email',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'password'], properties: {
          token:    { type: 'string' },
          password: { type: 'string', minLength: 8 }
        }}}}},
        responses: { '200': { description: 'Password updated' }, '400': { $ref: '#/components/responses/BadRequest' } }
      }
    },
    '/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User object', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      },
      put: {
        tags: ['Auth'],
        summary: 'Update current user profile',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          firstName: { type: 'string' }, lastName: { type: 'string' },
          username:  { type: 'string' }, bio:       { type: 'string' },
          profileImage: { type: 'string' }
        }}}}},
        responses: {
          '200': { description: 'Updated user' },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/auth/complete-setup': {
      post: {
        tags: ['Auth'],
        summary: 'Complete first-time account setup (Google OAuth users)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Setup complete' } }
      }
    },
    '/auth/account': {
      delete: {
        tags: ['Auth'],
        summary: 'Delete own account',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Account deleted' }, '401': { $ref: '#/components/responses/Unauthorized' } }
      }
    },

    // ── Users ─────────────────────────────────────────────────────────────
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page',    in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',   in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'role',    in: 'query', schema: { type: 'string' } },
          { name: 'search',  in: 'query', schema: { type: 'string' } },
          { name: 'sortBy',  in: 'query', schema: { type: 'string', enum: ['createdAt', 'username', 'email', 'role'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
        ],
        responses: {
          '200': { description: 'Paginated user list' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' }
        }
      }
    },
    '/users/statistics': {
      get: {
        tags: ['Users'],
        summary: 'User statistics (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Role counts, totals' } }
      }
    },
    '/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Public profile lookup by username (?username=…)',
        parameters: [{ name: 'username', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Public user profile' }, '404': { $ref: '#/components/responses/NotFound' } }
      }
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'User object' }, '404': { $ref: '#/components/responses/NotFound' } }
      },
      put: {
        tags: ['Users'],
        summary: 'Update user by ID (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated user' } }
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },
    '/users/{id}/role': {
      put: {
        tags: ['Users'],
        summary: 'Update user role (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['role'], properties: {
          role: { type: 'string', enum: ['Student', 'Writer', 'Editor', 'Teacher', 'Owner'] }
        }}}}},
        responses: { '200': { description: 'Role updated' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },

    // ── Posts ─────────────────────────────────────────────────────────────
    '/posts/public': {
      get: {
        tags: ['Posts'],
        summary: 'List published articles (public)',
        parameters: [
          { name: 'page',     in: 'query', schema: { type: 'integer' } },
          { name: 'limit',    in: 'query', schema: { type: 'integer' } },
          { name: 'category', in: 'query', schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'Paginated posts' } }
      }
    },
    '/posts/public/{id}': {
      get: {
        tags: ['Posts'],
        summary: 'Get single published article (public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Post object' }, '404': { $ref: '#/components/responses/NotFound' } }
      }
    },
    '/posts/featured': {
      get: {
        tags: ['Posts'],
        summary: 'Get featured articles (public)',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 3 } }],
        responses: { '200': { description: 'Featured posts' } }
      }
    },
    '/posts/search': {
      get: {
        tags: ['Posts'],
        summary: 'Full-text search (public)',
        parameters: [
          { name: 'search', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: { '200': { description: 'Matching posts' } }
      }
    },
    '/posts': {
      get: {
        tags: ['Posts'],
        summary: 'List all posts (authenticated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status',   in: 'query', schema: { type: 'string', enum: ['draft', 'pending_editor', 'pending_reviewer', 'published', 'archived'] } },
          { name: 'authorId', in: 'query', schema: { type: 'string' } },
          { name: 'page',     in: 'query', schema: { type: 'integer' } },
          { name: 'limit',    in: 'query', schema: { type: 'integer' } }
        ],
        responses: { '200': { description: 'Paginated posts' } }
      },
      post: {
        tags: ['Posts'],
        summary: 'Create a new post (Writer / Editor / Owner)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'content', 'category'], properties: {
          title:         { type: 'string' },
          content:       { type: 'string' },
          excerpt:       { type: 'string' },
          category:      { type: 'string' },
          tags:          { type: 'array', items: { type: 'string' } },
          featuredImage: { type: 'string' },
          status:        { type: 'string', enum: ['draft', 'pending_editor'] }
        }}}}},
        responses: { '201': { description: 'Created post' }, '400': { $ref: '#/components/responses/BadRequest' } }
      }
    },
    '/posts/my': {
      get: {
        tags: ['Posts'],
        summary: "Current user's own posts",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'pending_editor', 'pending_reviewer', 'published', 'archived'] } }
        ],
        responses: { '200': { description: 'Posts list' } }
      }
    },
    '/posts/bookmarks': {
      get: {
        tags: ['Posts'],
        summary: 'Get bookmarked posts for current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Bookmarked posts' } }
      }
    },
    '/posts/pending/editor': {
      get: {
        tags: ['Posts'],
        summary: 'Posts awaiting editor review (Editor / Owner)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Posts in pending_editor state' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },
    '/posts/pending/reviewer': {
      get: {
        tags: ['Posts'],
        summary: 'Posts awaiting teacher review (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Posts in pending_reviewer state' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },
    '/posts/{id}': {
      get: {
        tags: ['Posts'],
        summary: 'Get post by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Post object' }, '404': { $ref: '#/components/responses/NotFound' } }
      },
      put: {
        tags: ['Posts'],
        summary: 'Update post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated post' } }
      },
      delete: {
        tags: ['Posts'],
        summary: 'Delete post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } }
      }
    },
    '/posts/{id}/submit': {
      patch: {
        tags: ['Posts'],
        summary: 'Submit draft for editor review',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Status → pending_editor' } }
      }
    },
    '/posts/{id}/forward': {
      patch: {
        tags: ['Posts'],
        summary: 'Forward to teacher review (Editor)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Status → pending_reviewer' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },
    '/posts/{id}/publish-article': {
      patch: {
        tags: ['Posts'],
        summary: 'Publish article (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Status → published' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },
    '/posts/{id}/reject': {
      patch: {
        tags: ['Posts'],
        summary: 'Reject and return to draft',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Status → draft' } }
      }
    },
    '/posts/{id}/like': {
      patch: {
        tags: ['Posts'],
        summary: 'Toggle like on a post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '{ liked: boolean, likes: number }' } }
      }
    },
    '/posts/{postId}/bookmark': {
      patch: {
        tags: ['Posts'],
        summary: 'Toggle bookmark on a post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '{ bookmarked: boolean }' } }
      }
    },
    '/posts/{id}/interactions': {
      get: {
        tags: ['Posts'],
        summary: 'Get like/bookmark state for current user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '{ liked: boolean, bookmarked: boolean }' } }
      }
    },

    // ── Comments ─────────────────────────────────────────────────────────
    '/comments': {
      post: {
        tags: ['Comments'],
        summary: 'Create a comment',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['postId', 'content'], properties: {
          postId:   { type: 'string' },
          content:  { type: 'string', maxLength: 1000 },
          parentId: { type: 'string', description: 'Reply to comment ID' }
        }}}}},
        responses: { '201': { description: 'Comment created' } }
      }
    },
    '/comments/post/{postId}': {
      get: {
        tags: ['Comments'],
        summary: 'Get comments for a post',
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Comment list' } }
      }
    },
    '/comments/{commentId}': {
      put: {
        tags: ['Comments'],
        summary: 'Edit own comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated comment' } }
      },
      delete: {
        tags: ['Comments'],
        summary: 'Delete comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } }
      }
    },
    '/comments/{commentId}/like': {
      patch: {
        tags: ['Comments'],
        summary: 'Toggle like on a comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '{ liked: boolean, likes: number }' } }
      }
    },

    // ── Applications ──────────────────────────────────────────────────────
    '/applications': {
      get: {
        tags: ['Applications'],
        summary: 'List writer applications (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Applications list' }, '403': { $ref: '#/components/responses/Forbidden' } }
      },
      post: {
        tags: ['Applications'],
        summary: 'Submit a writer application (Student)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: {
          reason:        { type: 'string', minLength: 50, maxLength: 1000 },
          writingSample: { type: 'string', maxLength: 5000 }
        }}}}},
        responses: { '201': { description: 'Application submitted' }, '409': { description: 'Application already pending' } }
      }
    },
    '/applications/stats': {
      get: {
        tags: ['Applications'],
        summary: 'Application counts by status (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: '{ pending, approved, rejected, total }' } }
      }
    },
    '/applications/{id}': {
      get: {
        tags: ['Applications'],
        summary: 'Get application by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Application object' } }
      },
      patch: {
        tags: ['Applications'],
        summary: 'Review application — approve or reject (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: {
          status: { type: 'string', enum: ['approved', 'rejected'] }
        }}}}},
        responses: { '200': { description: 'Application updated' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },

    // ── Contact ───────────────────────────────────────────────────────────
    '/contact': {
      post: {
        tags: ['Contact'],
        summary: 'Submit contact form (rate-limited, spam-filtered)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'subject', 'message'], properties: {
          name:    { type: 'string' },
          email:   { type: 'string', format: 'email' },
          subject: { type: 'string' },
          message: { type: 'string', minLength: 10, maxLength: 5000 }
        }}}}},
        responses: { '200': { description: 'Message sent' }, '400': { description: 'Validation or spam rejection' }, '429': { description: 'Rate limit exceeded' } }
      }
    },
    '/contact/submissions': {
      get: {
        tags: ['Contact'],
        summary: 'List contact submissions (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['new', 'read', 'archived'] } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: { '200': { description: 'Submissions list' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },
    '/contact/submissions/{id}/status': {
      patch: {
        tags: ['Contact'],
        summary: 'Update submission status (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: {
          status: { type: 'string', enum: ['new', 'read', 'archived'] }
        }}}}},
        responses: { '200': { description: 'Status updated' } }
      }
    },
    '/contact/submissions/{id}': {
      delete: {
        tags: ['Contact'],
        summary: 'Delete submission (Teacher / Owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { $ref: '#/components/responses/NotFound' } }
      }
    },

    // ── Settings ──────────────────────────────────────────────────────────
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get site settings (public)',
        responses: { '200': { description: 'Settings object' } }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update site settings (Owner only)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Updated settings' }, '403': { $ref: '#/components/responses/Forbidden' } }
      }
    },

    // ── Games ─────────────────────────────────────────────────────────────
    '/wordle/puzzle': {
      get: {
        tags: ['Games'],
        summary: "Today's Wordle puzzle (authenticated)",
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Puzzle data' } }
      }
    },
    '/spelling-bee/puzzle': {
      get: {
        tags: ['Games'],
        summary: "Today's Spelling Bee puzzle",
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Puzzle data' } }
      }
    },
    '/strands/puzzle': {
      get: {
        tags: ['Games'],
        summary: "Today's Strands puzzle",
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Puzzle data' } }
      }
    },
    '/sudoku/puzzle': {
      get: {
        tags: ['Games'],
        summary: "Today's Sudoku puzzle",
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Puzzle data' } }
      }
    }
  }
};

export default spec;
