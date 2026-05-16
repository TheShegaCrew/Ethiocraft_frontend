import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardHeader } from '../dashboard-header';

// Mock gsap to avoid animation side-effects
jest.mock('gsap', () => ({
  set: jest.fn(),
  to: jest.fn(() => ({ kill: jest.fn() })),
  killTweensOf: jest.fn(),
}));

// Mock auth and cart hooks
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ role: 'CUSTOMER', logout: jest.fn() }) }));
jest.mock('@/lib/cart-context', () => ({ useCart: () => ({ cartCount: 0 }) }));

describe('DashboardHeader', () => {
  it('calls markAsRead when a notification is clicked and markAllAsRead when clicked', async () => {
    const markAsRead = jest.fn();
    const markAllAsRead = jest.fn();

    const notifications = [
      { id: 'n1', message: 'First note', time: 'now', unread: true },
      { id: 'n2', message: 'Second note', time: 'later', unread: false },
    ];

    render(
      <DashboardHeader
        notifications={notifications}
        unreadNotifications={1}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        statusText=""
      />
    );

    // Open the notifications by querying the bell by its aria-label
    const bell = screen.getByLabelText('Notifications');
    fireEvent.click(bell);

    // Find the first notification by its text and click it
    const firstNote = await screen.findByText('First note');
    fireEvent.click(firstNote);

    expect(markAsRead).toHaveBeenCalledWith('n1');

    // Find 'Mark all read' and click it
    const markAll = screen.getByText(/Mark all read/i);
    fireEvent.click(markAll);
    expect(markAllAsRead).toHaveBeenCalled();
  });
});

export {};
