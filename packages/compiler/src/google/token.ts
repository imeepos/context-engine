
export async function getGoogleToken(): Promise<string | null> {
    const tokenApi = 'https://bowongai-dev--bowong-ai-video-gemini-fastapi-webapp.modal.run/google/access-token'

    try {
        const response = await fetch(tokenApi, {
            headers: {
                'accept': 'application/json',
                'Authorization': 'Bearer bowong7777'
            }
        })

        if (!response.ok) {
            console.error(`获取 Token 失败，状态码: ${response.status}`)
            return null
        }

        const data = await response.json()
        return data.access_token || null
    } catch (error) {
        if (error instanceof TypeError) {
            console.error('请求 Token API 时发生网络错误:', error.message)
        } else {
            console.error('获取 Token 时发生未知错误:', error)
        }
        return null
    }
}