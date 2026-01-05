# Section prompt

## Task

Produce high-quality **User Segments** non-overlapping and grounded strictly in the inputs.

## Workflow

1. List distinct user segments who currently experience the problem from **Problem Statement:** or are directly affected by it. If there is a clearly defined user segment in the inputs or **Problem Statement:**, include it.

2. For each segment define 1-3 distinct**Usage contexts** as the conditions under which a user encounters the problem.
   Each usage context should specify:
   - When the problem occurs (time, frequency, urgency)
   - Where it occurs (physical or digital environment)
   - With what constraints (device, channel, regulation, attention level)
   - With whom (alone, assisted, multi-party)

3. For each segment define 3-7 **Characteristics** as observable behaviors that are directly related to the problem.

4. Assign a segment_type:
   - Exactly one the most essential segment must be `primary`. It is the segment that has the closest relationship to Inpouts and Problem Statement.
   - All others must be `secondary`.
   - The primary segment must appear first in the list.

5. Confirm each segment is distinct based on its usage contexts.

## Generation Rules

- Segmentation must be user-need-driven, not feature- or solution-driven.
- Each segment must be distinct and non-overlapping. If two segments differ only linguistically, merge or discard them.
- No invented personas, market sizes, or demographics unless explicitly provided in Inputs.
- Segment name must be concise (2-5 words) but at the same time be fully descriptive and unambiguous.
- Don't use overly general terms like "All Users" or "Everyone" or "Struggling individuals".
- Characteristics must be derived directly from the Inputs and the Problem Statement.
- Characteristics must be observable or verifiable behaviors, not motivations alone.
