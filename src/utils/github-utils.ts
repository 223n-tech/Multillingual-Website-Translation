/**
 * GitHubリポジトリURLを解析して情報を取得
 */
export interface GitHubRepoInfo {
  owner: string; // リポジトリ所有者（ユーザーまたは組織）
  repo: string; // リポジトリ名
  branch: string; // ブランチ名
  path: string; // ファイルパス
  filename: string; // ファイル名
}

/**
 * GitHubのRaw URLからリポジトリ情報を抽出
 * 例: https://raw.githubusercontent.com/username/repo/main/path/to/file.yml
 */
export function parseGitHubRepoUrl(rawUrl: string): GitHubRepoInfo | null {
  try {
    const url = new URL(rawUrl);

    // GitHub Raw URLであるか確認
    if (url.hostname !== 'raw.githubusercontent.com') {
      return null;
    }

    // URLパスを分解 (/username/repo/branch/path/to/file.yml)
    const pathParts = url.pathname.split('/').filter((part) => part.length > 0);

    if (pathParts.length < 4) {
      return null; // 有効なGitHub Raw URLではない
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    const branch = pathParts[2];

    // ファイル名を取得
    const filename = pathParts[pathParts.length - 1];

    // ファイルパスを構築 (owner/repo/branchを除く)
    const path = pathParts.slice(3).join('/');

    return {
      owner,
      repo,
      branch,
      path,
      filename,
    };
  } catch (error) {
    console.error('GitHubリポジトリURL解析エラー:', error);
    return null;
  }
}

/**
 * GitHub APIのURLを構築
 */
export function buildGitHubApiUrl(repoInfo: GitHubRepoInfo): string {
  return `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${repoInfo.path}`;
}

/**
 * GitHub APIを使用してファイルのSHAを取得
 */
export async function getGitHubFileSha(
  apiUrl: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${accessToken}`,
      },
    });

    if (!response.ok) {
      // 404の場合は新規ファイル（SHAは不要）
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GitHub API エラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.sha || null;
  } catch (error) {
    console.error('GitHub API SHA取得エラー:', error);
    throw error;
  }
}

/**
 * Base64エンコード
 */
export function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * GitHub APIを使用してファイルを更新または作成
 */
export async function updateGitHubFile(
  apiUrl: string,
  content: string,
  sha: string | null,
  message: string,
  branch: string,
  accessToken: string,
): Promise<boolean> {
  try {
    // リクエストボディを作成
    const payload: Record<string, unknown> = {
      message,
      content: encodeBase64(content),
      branch,
    };

    // 既存ファイルの更新の場合はSHAを含める
    if (sha) {
      payload.sha = sha;
    }

    // PUTリクエストを送信
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `GitHub API エラー: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`,
      );
    }

    return true;
  } catch (error) {
    console.error('GitHub APIファイル更新エラー:', error);
    throw error;
  }
}

/**
 * GitHubのRaw URLからWeb表示用URLに変換
 * 例: https://raw.githubusercontent.com/username/repo/main/file.yml
 *  → https://github.com/username/repo/blob/main/file.yml
 */
export function getWebUrlFromRawUrl(rawUrl: string): string | null {
  const repoInfo = parseGitHubRepoUrl(rawUrl);
  if (!repoInfo) {
    return null;
  }

  return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${repoInfo.branch}/${repoInfo.path}`;
}
