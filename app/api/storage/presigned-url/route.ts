import { createClient, getUserFromToken } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateS3Key } from '@/lib/storage/s3-upload'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { User } from '@supabase/supabase-js'

interface UserData {
  company_id: string
}

const s3Client = new S3Client({
  region: process.env.MAWS_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MAWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MAWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    let user: User | null = null
    let userData: UserData | null = null

    // Check if request has Authorization header (mobile app) or use cookies (web app)
    const authHeader = request.headers.get('Authorization')
    
    if (authHeader) {
      // Mobile app: Use Authorization header
      const accessToken = authHeader.replace('Bearer ', '')
      const { user: tokenUser, error: tokenError } = await getUserFromToken(accessToken)
      
      if (tokenError || !tokenUser) {
        console.error('Token validation error:', tokenError)
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Invalid token' },
          { status: 401 }
        )
      }
      
      user = tokenUser
      
      if (!user || !user.id) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Invalid user' },
          { status: 401 }
        )
      }
      
      // Get user's company using REST API with token
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const userResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${user.id}&select=company_id`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: anonKey,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      )
      
      if (!userResponse.ok) {
        console.error('Failed to fetch user data:', userResponse.statusText)
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: 500 }
        )
      }
      
      const userDataArray = await userResponse.json() as UserData[]
      userData = Array.isArray(userDataArray) ? userDataArray[0] : (userDataArray as UserData)
    } else {
      // Web app: Use cookies
      const supabase = await createClient()
      const {
        data: { user: cookieUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !cookieUser) {
        console.error('Auth error:', authError)
        return NextResponse.json(
          { error: 'Unauthorized', details: authError?.message },
          { status: 401 }
        )
      }
      
      user = cookieUser
      
      // Get user's company using cookie-based client
      const { data: cookieUserData, error: userDataError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()
      
      if (userDataError || !cookieUserData) {
        console.error('Failed to fetch user data:', userDataError)
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: 500 }
        )
      }
      
      userData = cookieUserData
    }

    if (!user || !userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    let body: {
      fileName: string
      fileType: string
      companyId: string
      type: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { fileName, fileType, companyId, type } = body

    if (!fileName || !fileType || !companyId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType, companyId, type' },
        { status: 400 }
      )
    }

    // Validate type
    if (type !== 'photo' && type !== 'audio') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "photo" or "audio"' },
        { status: 400 }
      )
    }

    // Verify user's company matches requested company
    if (!userData || !userData.company_id || userData.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'Company ID mismatch' },
        { status: 403 }
      )
    }

    // Generate S3 key
    const key = generateS3Key(companyId, type as 'photo' | 'audio', fileName)

    // Generate presigned URL using AWS SDK
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
    })

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    const cloudfrontUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`

    return NextResponse.json({
      url: presignedUrl,
      key,
      cloudfrontUrl,
    })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}
