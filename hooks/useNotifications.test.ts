import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';
import * as api from '@/lib/api';
import { mockNotifications } from './__fixtures__/notifications';

// Mock the API library
jest.mock('@/lib/api', () => ({
  fetchNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
}));

describe('useNotifications hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches notifications on mount', async () => {
    (api.fetchNotifications as jest.Mock).mockResolvedValueOnce({ items: mockNotifications });

    const { result } = renderHook(() => useNotifications({ enabled: true, pollIntervalMs: 0 }));

    expect(result.current.loading).toBe(true);
    
    // Wait for the async load to complete
    await act(async () => {
      // Small delay to allow the async effect to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.notifications.length).toBe(2);
    expect(result.current.unreadCount).toBe(2);
    expect(api.fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it('optimistically marks a notification as read and handles rollback on failure', async () => {
    (api.fetchNotifications as jest.Mock).mockResolvedValue({ items: mockNotifications });
    const { result } = renderHook(() => useNotifications({ enabled: true, pollIntervalMs: 0 }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Mock API failure for markAsRead
    (api.markNotificationAsRead as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    await act(async () => {
      await result.current.markAsRead('1');
    });

    // Because it failed, the rollback should trigger another fetchNotifications call
    expect(api.markNotificationAsRead).toHaveBeenCalledWith('1');
    expect(api.fetchNotifications).toHaveBeenCalledTimes(2);
  });
});
