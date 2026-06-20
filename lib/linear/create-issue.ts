const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";

const ISSUE_CREATE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        url
      }
    }
  }
`;

type CreateLinearIssueInput = {
  apiKey: string;
  teamId: string;
  title: string;
  description: string;
};

type CreateLinearIssueResult = {
  id: string;
  identifier: string;
  url: string;
};

export async function createLinearIssue(
  input: CreateLinearIssueInput,
): Promise<CreateLinearIssueResult> {
  const response = await fetch(LINEAR_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: input.apiKey,
    },
    body: JSON.stringify({
      query: ISSUE_CREATE_MUTATION,
      variables: {
        input: {
          teamId: input.teamId,
          title: input.title,
          description: input.description,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`linear_http_${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      issueCreate?: {
        success?: boolean;
        issue?: CreateLinearIssueResult | null;
      };
    };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    throw new Error("linear_graphql_error");
  }

  const issue = payload.data?.issueCreate?.issue;
  if (!payload.data?.issueCreate?.success || !issue) {
    throw new Error("linear_issue_create_failed");
  }

  return issue;
}
