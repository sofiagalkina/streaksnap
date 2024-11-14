// app/api/streaks/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
      if (id) {
          // Fetch a specific streak by ID
          const streak = await prisma.streak.findUnique({
              where: { id: parseInt(id) },
          });

          if (!streak) {
              return NextResponse.json({ error: 'Streak not found' }, { status: 404 });
          }

          return NextResponse.json(streak);
      } else {
          // Fetch all streaks
          const streaks = await prisma.streak.findMany();
          return NextResponse.json(streaks);
      }
  } catch (error) {
      return NextResponse.json({ error: 'Error fetching streak(s)' }, { status: 500 });
  }
}

// Handle POST requests
export async function POST(req: Request) {
  const body = await req.json();
  const { title, streakType, count, datatype, streakCount, average } = body;

  if (!title || !streakType) {
    return NextResponse.json({ error: 'Title and Streak Type are required' }, { status: 400 });
  }

  try {
    const newStreak = await prisma.streak.create({
      data: {
        title,
        streakType,
        streakCount: parseInt(streakCount, 10) || 0,
        count: parseFloat(count) || 0,
        average: parseFloat(average) || 0,
        datatype: streakType === 'COUNT' ? datatype : 'NONE',
      },
    });
    return NextResponse.json(newStreak);
  } catch (error) {
    console.error('Error creating streak:', error);
    return NextResponse.json({ error: 'Error creating streak' }, { status: 500 });
  }
}

// Handle PUT requests (Edit Streaks)
export async function PUT(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
      const { title, streakCount, count, average } = await request.json(); // Parse title and count from request body

      // Update the streak in the database
      const updatedStreak = await prisma.streak.update({
          where: { id: parseInt(id) },
          data: {
              title,
              streakCount,
              count,
              average
          },
      });

      return NextResponse.json(updatedStreak, { status: 200 });
  } catch (error) {
      console.error('Error updating streak:', error);
      return NextResponse.json({ error: 'Error updating streak' }, { status: 500 });
  }
}


// Handle PATCH requests (Update count and record streak)
export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, newCount } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    // Fetch the current streak
    const existingStreak = await prisma.streak.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!existingStreak) {
      return NextResponse.json({ error: 'Streak not found' }, { status: 404 });
    }

    // Determine if it's a count or simple streak
    let updatedStreak;

    if (existingStreak.streakType === 'COUNT') {
      // Update count streak
      if (newCount === undefined) {
        return NextResponse.json({ error: 'newCount is required for count streaks' }, { status: 400 });
      }

      updatedStreak = await prisma.streak.update({
        where: { id: parseInt(id, 10) },
        data: {
          count: existingStreak.count + parseFloat(newCount), // Update the count
          streakCount: existingStreak.streakCount + 1,        // Increment the streak count
          average: (existingStreak.count + parseFloat(newCount)) / (existingStreak.streakCount + 1), // Recalculate average
          lastUpdated: new Date(),                            // Update the last updated timestamp
        },
      });

    } else if (existingStreak.streakType === 'SIMPLE') {
      // Update simple streak (only increment streakCount and update lastUpdated)
      updatedStreak = await prisma.streak.update({
        where: { id: parseInt(id, 10) },
        data: {
          streakCount: existingStreak.streakCount + 1, // Increment the streak count
          lastUpdated: new Date(),                    // Update the last updated timestamp
        },
      });
    }

    return NextResponse.json(updatedStreak);
  } catch (error) {
    console.error('Error updating streak:', error);
    return NextResponse.json({ error: 'Error updating streak' }, { status: 500 });
  }
}