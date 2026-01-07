import { supabase } from "./supabase";

export type Project = {
  id: string;
  name: string;
  created_at: string;
};

export type ProjectDocument = {
  id: string;
  project_id: string;
  document_type: string;
  document: unknown;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = {
  project_id: string;
  product_idea: string;
  updated_at: string;
};

export type ProjectDocumentItem = {
  id: string;
  project_id: string;
  name: string;
  doc_type: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ProjectDocumentState = {
  project_id: string;
  last_selected_document_id: string | null;
  updated_at: string;
};

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data.session;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signInWithGoogle(redirectTo?: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      ...(redirectTo ? { redirectTo } : {}),
      queryParams: {
        prompt: "select_account"
      }
    }
  });
  if (error) {
    throw error;
  }
}

export async function resetPassword(email: string, redirectTo?: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });
  if (error) {
    throw error;
  }
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function listProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data || []) as Project[];
}

export async function createProject(name: string) {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw userError || new Error("User is not authenticated.");
  }
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, user_id: user.id, owner_user_id: user.id })
    .select("id,name,created_at")
    .single();
  if (error) {
    throw error;
  }
  return data as Project;
}

export async function renameProject(id: string, name: string) {
  const { data, error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", id)
    .select("id,name,created_at")
    .single();
  if (error) {
    throw error;
  }
  return data as Project;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function getProjectInput(projectId: string) {
  const { data, error } = await supabase
    .from("project_inputs")
    .select("project_id,product_idea,updated_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data || null) as ProjectInput | null;
}

export async function setProjectInput(projectId: string, productIdea: string) {
  const { data, error } = await supabase
    .from("project_inputs")
    .upsert(
      {
        project_id: projectId,
        product_idea: productIdea,
        updated_at: new Date().toISOString()
      },
      { onConflict: "project_id" }
    )
    .select("project_id,product_idea,updated_at")
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data || null) as ProjectInput | null;
}

export async function listProjectDocumentItems(projectId: string) {
  const { data, error } = await supabase
    .from("project_document_items")
    .select("id,project_id,name,doc_type,position,created_at,updated_at")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) {
    throw error;
  }
  return (data || []) as ProjectDocumentItem[];
}

export async function createProjectDocumentItems(
  projectId: string,
  names: string[]
) {
  const payload = names.map((name, index) => ({
    project_id: projectId,
    name,
    position: index,
    doc_type: "discovery"
  }));
  const { data, error } = await supabase
    .from("project_document_items")
    .insert(payload)
    .select("id,project_id,name,doc_type,position,created_at,updated_at");
  if (error) {
    throw error;
  }
  return (data || []) as ProjectDocumentItem[];
}

export async function deleteProjectDocumentItem(documentId: string) {
  const { error } = await supabase
    .from("project_document_items")
    .delete()
    .eq("id", documentId);
  if (error) {
    throw error;
  }
}

export async function getProjectDocumentState(projectId: string) {
  const { data, error } = await supabase
    .from("project_document_state")
    .select("project_id,last_selected_document_id,updated_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data || null) as ProjectDocumentState | null;
}

export async function setProjectDocumentState(
  projectId: string,
  documentId: string | null
) {
  const { data, error } = await supabase
    .from("project_document_state")
    .upsert(
      {
        project_id: projectId,
        last_selected_document_id: documentId,
        updated_at: new Date().toISOString()
      },
      { onConflict: "project_id" }
    )
    .select("project_id,last_selected_document_id,updated_at")
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data || null) as ProjectDocumentState | null;
}

export async function saveProjectDocument(
  projectId: string,
  document: unknown,
  documentType = "discovery"
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_documents")
    .upsert(
      {
        project_id: projectId,
        document_type: documentType,
        document,
        updated_at: now
      },
      { onConflict: "project_id,document_type" }
    )
    .select("id,project_id,document_type,document,created_at,updated_at")
    .single();
  if (error) {
    throw error;
  }
  return data as ProjectDocument;
}
