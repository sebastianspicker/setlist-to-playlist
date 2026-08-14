// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WorkflowStepHeader as StepHeader } from '../../src/components/WorkflowStepHeader';

afterEach(cleanup);

describe('StepHeader', () => {
  it.each([
    [1, 'Import'],
    [2, 'Preview'],
    [3, 'Match'],
    [4, 'Export'],
  ])('uses the built-in stage name for step %i', (step, stageName) => {
    render(<StepHeader step={step} title="Workflow stage" context="Stage context." />);

    expect(screen.getByText(`Step ${step} of 4 · ${stageName}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Workflow stage' })).toBeInTheDocument();
    expect(screen.getByText('Stage context.')).toBeInTheDocument();
  });
});
