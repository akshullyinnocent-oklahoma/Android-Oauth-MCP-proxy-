import { PresetServerTemplate } from '../types/mcp';

export const PRESET_TEMPLATES: PresetServerTemplate[] = [
  {
    id: 'github',
    name: 'GitHub MCP Server',
    description: 'OAuth 2.0 proxy to GitHub API MCP server for managing repositories, issues, PRs, and commits.',
    icon: 'github',
    category: 'developer',
    defaultServerUrl: 'https://api.githubcopilot.com/mcp/sse',
    defaultAuthEndpoint: 'https://github.com/login/oauth/authorize',
    defaultTokenEndpoint: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['repo', 'read:user', 'user:email', 'read:org'],
    requiresClientSecret: false,
    sampleTools: [
      {
        name: 'github_search_repositories',
        description: 'Search for GitHub repositories by query string with filters for stars, language, and topics.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search keywords, e.g. "mcp protocol language:typescript"' },
            sort: { type: 'string', enum: ['stars', 'forks', 'updated'], default: 'stars' },
            limit: { type: 'number', description: 'Number of results to return (1-100)', default: 10 },
          },
          required: ['query'],
        },
        source: 'preset',
      },
      {
        name: 'github_list_issues',
        description: 'List issues in a repository with state filter (open, closed, all) and assignee.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner (e.g. "octocat")' },
            repo: { type: 'string', description: 'Repository name (e.g. "Hello-World")' },
            state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' },
          },
          required: ['owner', 'repo'],
        },
        source: 'preset',
      },
      {
        name: 'github_create_issue',
        description: 'Create a new issue on behalf of the OAuth authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Issue title' },
            body: { type: 'string', description: 'Markdown body content' },
          },
          required: ['owner', 'repo', 'title'],
        },
        source: 'preset',
      },
      {
        name: 'github_get_user_profile',
        description: 'Get profile information for the authenticated GitHub user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        source: 'preset',
      },
    ],
  },
  {
    id: 'linear',
    name: 'Linear MCP Server',
    description: 'OAuth proxy to Linear workspace for reading tickets, updating project status, and managing cycles.',
    icon: 'linear',
    category: 'productivity',
    defaultServerUrl: 'https://mcp.linear.app/sse',
    defaultAuthEndpoint: 'https://linear.app/oauth/authorize',
    defaultTokenEndpoint: 'https://api.linear.app/oauth/token',
    defaultScopes: ['read', 'write', 'issues:create'],
    requiresClientSecret: false,
    sampleTools: [
      {
        name: 'linear_list_issues',
        description: 'Query assigned Linear issues with team and state filters.',
        inputSchema: {
          type: 'object',
          properties: {
            teamKey: { type: 'string', description: 'Team identifier (e.g. "ENG" or "PROD")' },
            status: { type: 'string', description: 'Issue status name, e.g. "In Progress", "Todo"' },
          },
        },
        source: 'preset',
      },
      {
        name: 'linear_create_issue',
        description: 'Create a new ticket in the authenticated Linear workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Linear Team ID' },
            title: { type: 'string', description: 'Issue title' },
            description: { type: 'string', description: 'Markdown description of the task' },
            priority: { type: 'number', description: 'Priority level (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)' },
          },
          required: ['teamId', 'title'],
        },
        source: 'preset',
      },
    ],
  },
  {
    id: 'slack',
    name: 'Slack MCP Server',
    description: 'OAuth 2.0 proxy to Slack channels, direct messages, and team canvas.',
    icon: 'slack',
    category: 'communication',
    defaultServerUrl: 'https://mcp-gateway.slack.com/sse',
    defaultAuthEndpoint: 'https://slack.com/oauth/v2/authorize',
    defaultTokenEndpoint: 'https://slack.com/api/oauth.v2.access',
    defaultScopes: ['channels:read', 'chat:write', 'users:read'],
    requiresClientSecret: true,
    sampleTools: [
      {
        name: 'slack_send_message',
        description: 'Post a chat message to a Slack channel as the authorized user or bot.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID (e.g. "C12345678")' },
            text: { type: 'string', description: 'Message text content' },
          },
          required: ['channel', 'text'],
        },
        source: 'preset',
      },
      {
        name: 'slack_list_channels',
        description: 'List public or private channels in the workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            types: { type: 'string', description: 'Comma-separated channel types', default: 'public_channel,private_channel' },
          },
        },
        source: 'preset',
      },
    ],
  },
  {
    id: 'notion',
    name: 'Notion MCP Server',
    description: 'OAuth proxy to Notion databases, workspace pages, and block trees.',
    icon: 'notion',
    category: 'productivity',
    defaultServerUrl: 'https://mcp.notion.com/sse',
    defaultAuthEndpoint: 'https://api.notion.com/v1/oauth/authorize',
    defaultTokenEndpoint: 'https://api.notion.com/v1/oauth/token',
    defaultScopes: ['read_content', 'update_content', 'insert_content'],
    requiresClientSecret: true,
    sampleTools: [
      {
        name: 'notion_search_pages',
        description: 'Search pages and databases across the authorized Notion workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search title or keyword' },
          },
          required: ['query'],
        },
        source: 'preset',
      },
      {
        name: 'notion_query_database',
        description: 'Query database rows with sort and filter conditions.',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: { type: 'string', description: 'UUID of the Notion database' },
          },
          required: ['database_id'],
        },
        source: 'preset',
      },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Remote MCP Server',
    description: 'Any remote MCP server endpoint that requires OAuth 2.0 PKCE, Bearer token, or custom authorization.',
    icon: 'server',
    category: 'custom',
    defaultServerUrl: 'https://remote-mcp.company.internal/sse',
    defaultAuthEndpoint: 'https://auth.company.internal/oauth2/authorize',
    defaultTokenEndpoint: 'https://auth.company.internal/oauth2/token',
    defaultScopes: ['mcp:read', 'mcp:write'],
    requiresClientSecret: false,
    sampleTools: [
      {
        name: 'remote_mcp_ping',
        description: 'Check health and protocol compliance of the custom remote MCP server.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        source: 'preset',
      },
      {
        name: 'remote_mcp_execute_action',
        description: 'Execute a protected action on the remote MCP server using the injected OAuth Bearer credential.',
        inputSchema: {
          type: 'object',
          properties: {
            action_name: { type: 'string', description: 'Target remote operation' },
            payload: { type: 'object', description: 'JSON payload passed to the remote operation' },
          },
          required: ['action_name'],
        },
        source: 'preset',
      },
    ],
  },
];
