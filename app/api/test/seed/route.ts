import { NextResponse } from 'next/server'
import { seedTestData } from '@/lib/test-data/seed'

export async function POST() {
  try {
    const result = await seedTestData()
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test verileri başarıyla oluşturuldu',
      data: result,
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: error.message || 'Seed işlemi başarısız' },
      { status: 500 }
    )
  }
}

