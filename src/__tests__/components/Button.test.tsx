import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('bg-amber-500');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByText('Secondary')).toHaveClass('bg-gray-100');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByText('Outline')).toHaveClass('border-gray-300');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByText('Ghost')).toHaveClass('hover:bg-gray-100');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByText('Danger')).toHaveClass('bg-red-500');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByText('Small')).toHaveClass('px-3');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByText('Medium')).toHaveClass('px-4');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByText('Large')).toHaveClass('px-6');
  });

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByText('Loading')).toBeDisabled();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('renders as a link when href is provided', () => {
    render(<Button href="/test">Link Button</Button>);
    expect(screen.getByText('Link Button').closest('a')).toHaveAttribute('href', '/test');
  });

  it('renders full width when fullWidth is true', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByText('Full Width')).toHaveClass('w-full');
  });

  it('renders with left and right icons', () => {
    const LeftIcon = () => <span data-testid="left-icon">L</span>;
    const RightIcon = () => <span data-testid="right-icon">R</span>;

    render(
      <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
        With Icons
      </Button>
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });
});
