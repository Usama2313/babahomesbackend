const axios = require('axios');

const BUFFER_API_URL = 'https://api.buffer.com';

/**
 * Post an update to Buffer using the official GraphQL API.
 * 
 * @param {Object} param0
 * @param {string} param0.caption - Text caption for the post.
 * @param {Array<string>} param0.imageUrls - Public image URLs to attach (must be publicly accessible).
 * @param {Array<string>} param0.videoUrls - Public video URLs to attach (must be publicly accessible).
 * @returns {Promise<{success: boolean, postId?: string, message?: string}>}
 */
async function postToBuffer({ caption, imageUrls = [], videoUrls = [] }) {
  const accessToken = process.env.BUFFER_API_KEY;
  const channelId = process.env.BUFFER_CHANNEL_ID;

  if (!accessToken) {
    throw new Error('BUFFER_API_KEY is not configured in environment variables.');
  }
  if (!channelId) {
    throw new Error('BUFFER_CHANNEL_ID is not configured in environment variables.');
  }

  // Build assets array from image and video URLs
  // Buffer requires publicly accessible URLs — filter out data URIs and empty strings
  const assets = [];

  for (const url of imageUrls) {
    if (url && typeof url === 'string' && url.startsWith('http')) {
      assets.push({ image: { url } });
    }
  }

  for (const url of videoUrls) {
    if (url && typeof url === 'string' && url.startsWith('http')) {
      assets.push({ video: { url } });
    }
  }

  // Build the GraphQL mutation
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            text
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      text: caption || '',
      channelId,
      schedulingType: 'automatic',
      mode: 'shareNow',
      ...(assets.length > 0 ? { assets } : {}),
    },
  };

  console.log(`[Buffer API] Posting to channel ${channelId} with ${assets.length} media assets...`);

  try {
    const response = await axios.post(
      BUFFER_API_URL,
      { query: mutation, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 30000,
      }
    );

    const data = response.data;

    // Check for GraphQL errors
    if (data.errors && data.errors.length > 0) {
      const errorMsg = data.errors.map(e => e.message).join('; ');
      console.error('[Buffer API] GraphQL errors:', errorMsg);
      throw new Error(`Buffer API error: ${errorMsg}`);
    }

    const result = data?.data?.createPost;

    // Check for mutation-level error
    if (result?.message) {
      console.error('[Buffer API] Mutation error:', result.message);
      throw new Error(`Buffer post failed: ${result.message}`);
    }

    // Success
    if (result?.post?.id) {
      console.log(`[Buffer API] Post created successfully! ID: ${result.post.id}`);
      return {
        success: true,
        postId: result.post.id,
        message: 'Posted to Buffer successfully!',
      };
    }

    // Unexpected response shape
    console.warn('[Buffer API] Unexpected response:', JSON.stringify(data));
    throw new Error('Unexpected response from Buffer API.');
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const body = error.response.data;
      console.error(`[Buffer API] HTTP ${status}:`, JSON.stringify(body));
      throw new Error(`Buffer API returned HTTP ${status}: ${JSON.stringify(body?.errors || body?.message || body)}`);
    }
    throw error;
  }
}

module.exports = { postToBuffer };
