# React Hook Pattern for PayZone Integration

## Overview

This pattern centralizes PayZone payment logic in a reusable hook, eliminating code duplication across multiple booking flows. Instead of managing PayZone state in each component, the hook handles everything internally.

## Architecture Benefits

| Before (Bad) | After (Good) |
|--------------|--------------|
| State duplication in 4+ components | Single source of truth in hook |
| Circular reference bugs | Clean callback-based flow |
| ~40 lines duplicate code per component | ~3 lines config per component |
| Hard to maintain | Easy to modify in one place |

## Hook Interface

```typescript
// hooks/useBookingFlow.ts
export interface UseBookingFlowOptions<TFormData> {
  // ... other options
  
  /**
   * Determine if current payment method requires PayZone redirect.
   * Called after successful booking creation.
   */
  isPayzonePayment?: (formData: TFormData) => boolean;
  
  /**
   * Calculate total price for PayZone payment.
   * Required if isPayzonePayment is provided.
   */
  getPayzoneTotalPrice?: (formData: TFormData) => number;
  
  /**
   * Generate description shown to user in PayZone.
   * Required if isPayzonePayment is provided.
   */
  getPayzoneDescription?: (formData: TFormData, bookingReference: string) => string;
}

export interface UseBookingFlowReturn<TFormData> {
  // ... other returns
  
  // PayZone state (managed internally)
  payzoneData: { payload: string; signature: string; payzoneUrl: string } | null;
  isRedirectingToPayzone: boolean;
  payzoneError: string | null;
  clearPayzoneError: () => void;
  requiresPayzoneRedirect: boolean;
}
```

## Implementation Example

### 1. Component Configuration (Minimal Code)

Each booking component only needs to provide 3 callbacks:

```typescript
// components/BookingFlow.tsx
const flow = useBookingFlow<BookingFormData>({
  totalSteps: 4,
  initialFormData: INITIAL_FORM_DATA,
  schema: bookingSchema,
  mapBooking: (data) => /* ... */,
  validateStep: (step, data) => /* ... */,
  
  // PayZone Configuration (just 3 lines!)
  isPayzonePayment: (formData) => formData.paymentMethod === "carte_bancaire",
  getPayzoneTotalPrice: (formData) => computeTotalPrice(formData),
  getPayzoneDescription: (_formData, bookingReference) =>
    `Réservation #${bookingReference}`,
});
```

### 2. Conditional Rendering

Components check hook state to render PayZone redirect:

```tsx
const renderContent = () => {
  // Priority 1: PayZone redirect (blocks UI)
  if (flow.payzoneData) {
    return (
      <PayzoneRedirect
        payload={flow.payzoneData.payload}
        signature={flow.payzoneData.signature}
        payzoneUrl={flow.payzoneData.payzoneUrl}
      />
    );
  }

  // Priority 2: Success state
  if (flow.isSuccess) {
    return <BookingSuccessState />;
  }

  // Priority 3: Normal booking steps
  return (
    <>
      {/* Your form steps */}
    </>
  );
};
```

### 3. Loading States

Hook provides unified loading state:

```tsx
<BookingFlowContainer
  isNextLoading={flow.isSubmitting || flow.isRedirectingToPayzone}
  // ... other props
/>
```

## Error Handling

The hook manages errors internally:

```typescript
// Hook provides error state
const { payzoneError, clearPayzoneError } = useBookingFlow(...);

// Component can show error and allow retry
{payzoneError && (
  <Alert variant="destructive">
    <AlertTitle>Payment Error</AlertTitle>
    <AlertDescription>{payzoneError}</AlertDescription>
    <Button onClick={clearPayzoneError}>Try Again</Button>
  </Alert>
)}
```

## Flow Control

1. **User clicks "Confirm"** → `handleNext()` called
2. **Validation passes** → Booking created via Convex mutation
3. **Check PayZone payment** → If `isPayzonePayment()` returns true:
   - Call `initiatePayzonePayment` Server Action
   - Set `payzoneData` state
   - Component renders `<PayzoneRedirect />`
4. **Form auto-submits** → User redirected to PayZone
5. **Payment completes** → PayZone webhook hits Convex
6. **Database updated** → Booking marked as paid

## Multiple Booking Types Example

Same hook works for different booking flows:

```typescript
// Travel Booking
const travelFlow = useBookingFlow<TravelFormData>({
  // ... config
  getPayzoneDescription: (_data, ref) => `Voyage #${ref}`,
});

// Stay Booking  
const stayFlow = useBookingFlow<StayFormData>({
  // ... config
  getPayzoneDescription: (_data, ref) => `Séjour #${ref}`,
});

// Activity Booking
const activityFlow = useBookingFlow<ActivityFormData>({
  // ... config
  getPayzoneDescription: (_data, ref) => `Activité #${ref}`,
});
```

## Key Principles

1. **Hook owns PayZone state** - Components only provide configuration
2. **Callbacks are pure functions** - No side effects, easy to test
3. **Error boundaries** - Hook catches and exposes errors
4. **Type safety** - Generic `TFormData` ensures type safety
5. **Single responsibility** - Each callback does one thing

## Testing

Test the hook in isolation:

```typescript
describe('useBookingFlow', () => {
  it('should initiate PayZone for credit card payments', async () => {
    const { result } = renderHook(() =>
      useBookingFlow({
        isPayzonePayment: (data) => data.paymentMethod === 'carte_bancaire',
        getPayzoneTotalPrice: (data) => data.amount,
        getPayzoneDescription: (_, ref) => `Test #${ref}`,
      })
    );

    // Assert payzoneData is set after submission
  });
});
```
