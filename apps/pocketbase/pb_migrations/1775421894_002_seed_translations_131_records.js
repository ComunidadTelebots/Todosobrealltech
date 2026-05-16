/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("translations");

  const record0 = new Record(collection);
    record0.set("key", "header.logo");
    record0.set("es", "Todo sobre alltech");
    record0.set("en", "All about alltech");
    record0.set("pt", "Tudo sobre alltech");
    record0.set("fr", "Tout sur alltech");
    record0.set("de", "Alles \u00fcber alltech");
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record1 = new Record(collection);
    record1.set("key", "header.home");
    record1.set("es", "Inicio");
    record1.set("en", "Home");
    record1.set("pt", "In\u00edcio");
    record1.set("fr", "Accueil");
    record1.set("de", "Startseite");
  try {
    app.save(record1);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record2 = new Record(collection);
    record2.set("key", "header.dashboard");
    record2.set("es", "Dashboard");
    record2.set("en", "Dashboard");
    record2.set("pt", "Painel");
    record2.set("fr", "Tableau de Bord");
    record2.set("de", "Dashboard");
  try {
    app.save(record2);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record3 = new Record(collection);
    record3.set("key", "header.blog");
    record3.set("es", "Blog");
    record3.set("en", "Blog");
    record3.set("pt", "Blog");
    record3.set("fr", "Blog");
    record3.set("de", "Blog");
  try {
    app.save(record3);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record4 = new Record(collection);
    record4.set("key", "header.admin");
    record4.set("es", "Administraci\u00f3n");
    record4.set("en", "Administration");
    record4.set("pt", "Administra\u00e7\u00e3o");
    record4.set("fr", "Administration");
    record4.set("de", "Verwaltung");
  try {
    app.save(record4);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record5 = new Record(collection);
    record5.set("key", "header.creator");
    record5.set("es", "Panel Creador");
    record5.set("en", "Creator Panel");
    record5.set("pt", "Painel do Criador");
    record5.set("fr", "Panneau Cr\u00e9ateur");
    record5.set("de", "Creator-Panel");
  try {
    app.save(record5);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record6 = new Record(collection);
    record6.set("key", "header.profile");
    record6.set("es", "Mi Perfil");
    record6.set("en", "My Profile");
    record6.set("pt", "Meu Perfil");
    record6.set("fr", "Mon Profil");
    record6.set("de", "Mein Profil");
  try {
    app.save(record6);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record7 = new Record(collection);
    record7.set("key", "header.logout");
    record7.set("es", "Cerrar Sesi\u00f3n");
    record7.set("en", "Logout");
    record7.set("pt", "Sair");
    record7.set("fr", "D\u00e9connexion");
    record7.set("de", "Abmelden");
  try {
    app.save(record7);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record8 = new Record(collection);
    record8.set("key", "header.login");
    record8.set("es", "Iniciar Sesi\u00f3n");
    record8.set("en", "Login");
    record8.set("pt", "Entrar");
    record8.set("fr", "Connexion");
    record8.set("de", "Anmelden");
  try {
    app.save(record8);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record9 = new Record(collection);
    record9.set("key", "header.signup");
    record9.set("es", "Registrarse");
    record9.set("en", "Sign Up");
    record9.set("pt", "Registrar-se");
    record9.set("fr", "S'inscrire");
    record9.set("de", "Registrieren");
  try {
    app.save(record9);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record10 = new Record(collection);
    record10.set("key", "header.language");
    record10.set("es", "Idioma");
    record10.set("en", "Language");
    record10.set("pt", "Idioma");
    record10.set("fr", "Langue");
    record10.set("de", "Sprache");
  try {
    app.save(record10);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record11 = new Record(collection);
    record11.set("key", "auth.login_title");
    record11.set("es", "Iniciar Sesi\u00f3n");
    record11.set("en", "Login");
    record11.set("pt", "Entrar");
    record11.set("fr", "Connexion");
    record11.set("de", "Anmelden");
  try {
    app.save(record11);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record12 = new Record(collection);
    record12.set("key", "auth.signup_title");
    record12.set("es", "Crear Cuenta");
    record12.set("en", "Create Account");
    record12.set("pt", "Criar Conta");
    record12.set("fr", "Cr\u00e9er un Compte");
    record12.set("de", "Konto Erstellen");
  try {
    app.save(record12);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record13 = new Record(collection);
    record13.set("key", "auth.email");
    record13.set("es", "Correo Electr\u00f3nico");
    record13.set("en", "Email");
    record13.set("pt", "E-mail");
    record13.set("fr", "E-mail");
    record13.set("de", "E-Mail");
  try {
    app.save(record13);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record14 = new Record(collection);
    record14.set("key", "auth.password");
    record14.set("es", "Contrase\u00f1a");
    record14.set("en", "Password");
    record14.set("pt", "Senha");
    record14.set("fr", "Mot de Passe");
    record14.set("de", "Passwort");
  try {
    app.save(record14);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record15 = new Record(collection);
    record15.set("key", "auth.confirm_password");
    record15.set("es", "Confirmar Contrase\u00f1a");
    record15.set("en", "Confirm Password");
    record15.set("pt", "Confirmar Senha");
    record15.set("fr", "Confirmer le Mot de Passe");
    record15.set("de", "Passwort Best\u00e4tigen");
  try {
    app.save(record15);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record16 = new Record(collection);
    record16.set("key", "auth.name");
    record16.set("es", "Nombre");
    record16.set("en", "Name");
    record16.set("pt", "Nome");
    record16.set("fr", "Nom");
    record16.set("de", "Name");
  try {
    app.save(record16);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record17 = new Record(collection);
    record17.set("key", "auth.login_button");
    record17.set("es", "Iniciar Sesi\u00f3n");
    record17.set("en", "Login");
    record17.set("pt", "Entrar");
    record17.set("fr", "Connexion");
    record17.set("de", "Anmelden");
  try {
    app.save(record17);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record18 = new Record(collection);
    record18.set("key", "auth.signup_button");
    record18.set("es", "Crear Cuenta");
    record18.set("en", "Sign Up");
    record18.set("pt", "Registrar-se");
    record18.set("fr", "S'inscrire");
    record18.set("de", "Registrieren");
  try {
    app.save(record18);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record19 = new Record(collection);
    record19.set("key", "auth.forgot_password");
    record19.set("es", "\u00bfOlvidaste tu contrase\u00f1a?");
    record19.set("en", "Forgot your password?");
    record19.set("pt", "Esqueceu sua senha?");
    record19.set("fr", "Mot de passe oubli\u00e9?");
    record19.set("de", "Passwort vergessen?");
  try {
    app.save(record19);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record20 = new Record(collection);
    record20.set("key", "auth.no_account");
    record20.set("es", "\u00bfNo tienes cuenta?");
    record20.set("en", "Don't have an account?");
    record20.set("pt", "N\u00e3o tem uma conta?");
    record20.set("fr", "Vous n'avez pas de compte?");
    record20.set("de", "Haben Sie kein Konto?");
  try {
    app.save(record20);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record21 = new Record(collection);
    record21.set("key", "auth.have_account");
    record21.set("es", "\u00bfYa tienes cuenta?");
    record21.set("en", "Already have an account?");
    record21.set("pt", "J\u00e1 tem uma conta?");
    record21.set("fr", "Vous avez d\u00e9j\u00e0 un compte?");
    record21.set("de", "Haben Sie bereits ein Konto?");
  try {
    app.save(record21);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record22 = new Record(collection);
    record22.set("key", "auth.login_here");
    record22.set("es", "Inicia sesi\u00f3n aqu\u00ed");
    record22.set("en", "Login here");
    record22.set("pt", "Entre aqui");
    record22.set("fr", "Connectez-vous ici");
    record22.set("de", "Melden Sie sich hier an");
  try {
    app.save(record22);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record23 = new Record(collection);
    record23.set("key", "auth.signup_here");
    record23.set("es", "Reg\u00edstrate aqu\u00ed");
    record23.set("en", "Sign up here");
    record23.set("pt", "Registre-se aqui");
    record23.set("fr", "Inscrivez-vous ici");
    record23.set("de", "Registrieren Sie sich hier");
  try {
    app.save(record23);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record24 = new Record(collection);
    record24.set("key", "dashboard.title");
    record24.set("es", "Dashboard");
    record24.set("en", "Dashboard");
    record24.set("pt", "Painel");
    record24.set("fr", "Tableau de Bord");
    record24.set("de", "Dashboard");
  try {
    app.save(record24);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record25 = new Record(collection);
    record25.set("key", "dashboard.welcome");
    record25.set("es", "Bienvenido");
    record25.set("en", "Welcome");
    record25.set("pt", "Bem-vindo");
    record25.set("fr", "Bienvenue");
    record25.set("de", "Willkommen");
  try {
    app.save(record25);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record26 = new Record(collection);
    record26.set("key", "dashboard.my_bots");
    record26.set("es", "Mis Bots");
    record26.set("en", "My Bots");
    record26.set("pt", "Meus Bots");
    record26.set("fr", "Mes Bots");
    record26.set("de", "Meine Bots");
  try {
    app.save(record26);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record27 = new Record(collection);
    record27.set("key", "dashboard.create_bot");
    record27.set("es", "Crear Bot");
    record27.set("en", "Create Bot");
    record27.set("pt", "Criar Bot");
    record27.set("fr", "Cr\u00e9er un Bot");
    record27.set("de", "Bot Erstellen");
  try {
    app.save(record27);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record28 = new Record(collection);
    record28.set("key", "dashboard.recent_bots");
    record28.set("es", "Bots Recientes");
    record28.set("en", "Recent Bots");
    record28.set("pt", "Bots Recentes");
    record28.set("fr", "Bots R\u00e9cents");
    record28.set("de", "Aktuelle Bots");
  try {
    app.save(record28);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record29 = new Record(collection);
    record29.set("key", "dashboard.total_bots");
    record29.set("es", "Total de Bots");
    record29.set("en", "Total Bots");
    record29.set("pt", "Total de Bots");
    record29.set("fr", "Total des Bots");
    record29.set("de", "Gesamtzahl der Bots");
  try {
    app.save(record29);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record30 = new Record(collection);
    record30.set("key", "dashboard.active_bots");
    record30.set("es", "Bots Activos");
    record30.set("en", "Active Bots");
    record30.set("pt", "Bots Ativos");
    record30.set("fr", "Bots Actifs");
    record30.set("de", "Aktive Bots");
  try {
    app.save(record30);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record31 = new Record(collection);
    record31.set("key", "dashboard.recent_articles");
    record31.set("es", "Art\u00edculos Recientes");
    record31.set("en", "Recent Articles");
    record31.set("pt", "Artigos Recentes");
    record31.set("fr", "Articles R\u00e9cents");
    record31.set("de", "Aktuelle Artikel");
  try {
    app.save(record31);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record32 = new Record(collection);
    record32.set("key", "dashboard.pending_comments");
    record32.set("es", "Comentarios Pendientes");
    record32.set("en", "Pending Comments");
    record32.set("pt", "Coment\u00e1rios Pendentes");
    record32.set("fr", "Commentaires en Attente");
    record32.set("de", "Ausstehende Kommentare");
  try {
    app.save(record32);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record33 = new Record(collection);
    record33.set("key", "bots.title");
    record33.set("es", "Mis Bots");
    record33.set("en", "My Bots");
    record33.set("pt", "Meus Bots");
    record33.set("fr", "Mes Bots");
    record33.set("de", "Meine Bots");
  try {
    app.save(record33);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record34 = new Record(collection);
    record34.set("key", "bots.create_new");
    record34.set("es", "Crear Nuevo Bot");
    record34.set("en", "Create New Bot");
    record34.set("pt", "Criar Novo Bot");
    record34.set("fr", "Cr\u00e9er un Nouveau Bot");
    record34.set("de", "Neuen Bot Erstellen");
  try {
    app.save(record34);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record35 = new Record(collection);
    record35.set("key", "bots.name");
    record35.set("es", "Nombre del Bot");
    record35.set("en", "Bot Name");
    record35.set("pt", "Nome do Bot");
    record35.set("fr", "Nom du Bot");
    record35.set("de", "Bot-Name");
  try {
    app.save(record35);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record36 = new Record(collection);
    record36.set("key", "bots.description");
    record36.set("es", "Descripci\u00f3n");
    record36.set("en", "Description");
    record36.set("pt", "Descri\u00e7\u00e3o");
    record36.set("fr", "Description");
    record36.set("de", "Beschreibung");
  try {
    app.save(record36);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record37 = new Record(collection);
    record37.set("key", "bots.status");
    record37.set("es", "Estado");
    record37.set("en", "Status");
    record37.set("pt", "Status");
    record37.set("fr", "Statut");
    record37.set("de", "Status");
  try {
    app.save(record37);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record38 = new Record(collection);
    record38.set("key", "bots.active");
    record38.set("es", "Activo");
    record38.set("en", "Active");
    record38.set("pt", "Ativo");
    record38.set("fr", "Actif");
    record38.set("de", "Aktiv");
  try {
    app.save(record38);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record39 = new Record(collection);
    record39.set("key", "bots.inactive");
    record39.set("es", "Inactivo");
    record39.set("en", "Inactive");
    record39.set("pt", "Inativo");
    record39.set("fr", "Inactif");
    record39.set("de", "Inaktiv");
  try {
    app.save(record39);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record40 = new Record(collection);
    record40.set("key", "bots.edit");
    record40.set("es", "Editar");
    record40.set("en", "Edit");
    record40.set("pt", "Editar");
    record40.set("fr", "Modifier");
    record40.set("de", "Bearbeiten");
  try {
    app.save(record40);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record41 = new Record(collection);
    record41.set("key", "bots.delete");
    record41.set("es", "Eliminar");
    record41.set("en", "Delete");
    record41.set("pt", "Excluir");
    record41.set("fr", "Supprimer");
    record41.set("de", "L\u00f6schen");
  try {
    app.save(record41);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record42 = new Record(collection);
    record42.set("key", "bots.created");
    record42.set("es", "Creado");
    record42.set("en", "Created");
    record42.set("pt", "Criado");
    record42.set("fr", "Cr\u00e9\u00e9");
    record42.set("de", "Erstellt");
  try {
    app.save(record42);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record43 = new Record(collection);
    record43.set("key", "bots.no_bots");
    record43.set("es", "No tienes bots a\u00fan");
    record43.set("en", "You don't have any bots yet");
    record43.set("pt", "Voc\u00ea ainda n\u00e3o tem bots");
    record43.set("fr", "Vous n'avez pas encore de bots");
    record43.set("de", "Sie haben noch keine Bots");
  try {
    app.save(record43);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record44 = new Record(collection);
    record44.set("key", "bots.create_first");
    record44.set("es", "Crea tu primer bot");
    record44.set("en", "Create your first bot");
    record44.set("pt", "Crie seu primeiro bot");
    record44.set("fr", "Cr\u00e9ez votre premier bot");
    record44.set("de", "Erstellen Sie Ihren ersten Bot");
  try {
    app.save(record44);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record45 = new Record(collection);
    record45.set("key", "blog.title");
    record45.set("es", "Blog");
    record45.set("en", "Blog");
    record45.set("pt", "Blog");
    record45.set("fr", "Blog");
    record45.set("de", "Blog");
  try {
    app.save(record45);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record46 = new Record(collection);
    record46.set("key", "blog.articles");
    record46.set("es", "Art\u00edculos");
    record46.set("en", "Articles");
    record46.set("pt", "Artigos");
    record46.set("fr", "Articles");
    record46.set("de", "Artikel");
  try {
    app.save(record46);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record47 = new Record(collection);
    record47.set("key", "blog.search");
    record47.set("es", "Buscar art\u00edculos...");
    record47.set("en", "Search articles...");
    record47.set("pt", "Pesquisar artigos...");
    record47.set("fr", "Rechercher des articles...");
    record47.set("de", "Artikel durchsuchen...");
  try {
    app.save(record47);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record48 = new Record(collection);
    record48.set("key", "blog.category");
    record48.set("es", "Categor\u00eda");
    record48.set("en", "Category");
    record48.set("pt", "Categoria");
    record48.set("fr", "Cat\u00e9gorie");
    record48.set("de", "Kategorie");
  try {
    app.save(record48);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record49 = new Record(collection);
    record49.set("key", "blog.all_categories");
    record49.set("es", "Todas las categor\u00edas");
    record49.set("en", "All categories");
    record49.set("pt", "Todas as categorias");
    record49.set("fr", "Toutes les cat\u00e9gories");
    record49.set("de", "Alle Kategorien");
  try {
    app.save(record49);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record50 = new Record(collection);
    record50.set("key", "blog.featured");
    record50.set("es", "Destacados");
    record50.set("en", "Featured");
    record50.set("pt", "Destaque");
    record50.set("fr", "En Vedette");
    record50.set("de", "Hervorgehoben");
  try {
    app.save(record50);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record51 = new Record(collection);
    record51.set("key", "blog.read_more");
    record51.set("es", "Leer m\u00e1s");
    record51.set("en", "Read More");
    record51.set("pt", "Ler Mais");
    record51.set("fr", "Lire la Suite");
    record51.set("de", "Mehr Lesen");
  try {
    app.save(record51);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record52 = new Record(collection);
    record52.set("key", "blog.author");
    record52.set("es", "Autor");
    record52.set("en", "Author");
    record52.set("pt", "Autor");
    record52.set("fr", "Auteur");
    record52.set("de", "Autor");
  try {
    app.save(record52);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record53 = new Record(collection);
    record53.set("key", "blog.published");
    record53.set("es", "Publicado");
    record53.set("en", "Published");
    record53.set("pt", "Publicado");
    record53.set("fr", "Publi\u00e9");
    record53.set("de", "Ver\u00f6ffentlicht");
  try {
    app.save(record53);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record54 = new Record(collection);
    record54.set("key", "blog.views");
    record54.set("es", "Vistas");
    record54.set("en", "Views");
    record54.set("pt", "Visualiza\u00e7\u00f5es");
    record54.set("fr", "Vues");
    record54.set("de", "Aufrufe");
  try {
    app.save(record54);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record55 = new Record(collection);
    record55.set("key", "blog.comments");
    record55.set("es", "Comentarios");
    record55.set("en", "Comments");
    record55.set("pt", "Coment\u00e1rios");
    record55.set("fr", "Commentaires");
    record55.set("de", "Kommentare");
  try {
    app.save(record55);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record56 = new Record(collection);
    record56.set("key", "blog.related_articles");
    record56.set("es", "Art\u00edculos Relacionados");
    record56.set("en", "Related Articles");
    record56.set("pt", "Artigos Relacionados");
    record56.set("fr", "Articles Connexes");
    record56.set("de", "Verwandte Artikel");
  try {
    app.save(record56);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record57 = new Record(collection);
    record57.set("key", "blog.share");
    record57.set("es", "Compartir");
    record57.set("en", "Share");
    record57.set("pt", "Compartilhar");
    record57.set("fr", "Partager");
    record57.set("de", "Teilen");
  try {
    app.save(record57);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record58 = new Record(collection);
    record58.set("key", "blog.comment");
    record58.set("es", "Comentar");
    record58.set("en", "Comment");
    record58.set("pt", "Comentar");
    record58.set("fr", "Commenter");
    record58.set("de", "Kommentieren");
  try {
    app.save(record58);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record59 = new Record(collection);
    record59.set("key", "blog.no_comments");
    record59.set("es", "Sin comentarios a\u00fan");
    record59.set("en", "No comments yet");
    record59.set("pt", "Sem coment\u00e1rios ainda");
    record59.set("fr", "Pas de commentaires pour le moment");
    record59.set("de", "Noch keine Kommentare");
  try {
    app.save(record59);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record60 = new Record(collection);
    record60.set("key", "blog.comment_placeholder");
    record60.set("es", "Escribe tu comentario...");
    record60.set("en", "Write your comment...");
    record60.set("pt", "Escreva seu coment\u00e1rio...");
    record60.set("fr", "\u00c9crivez votre commentaire...");
    record60.set("de", "Schreiben Sie Ihren Kommentar...");
  try {
    app.save(record60);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record61 = new Record(collection);
    record61.set("key", "blog.submit_comment");
    record61.set("es", "Enviar Comentario");
    record61.set("en", "Submit Comment");
    record61.set("pt", "Enviar Coment\u00e1rio");
    record61.set("fr", "Soumettre un Commentaire");
    record61.set("de", "Kommentar Absenden");
  try {
    app.save(record61);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record62 = new Record(collection);
    record62.set("key", "admin.title");
    record62.set("es", "Administraci\u00f3n");
    record62.set("en", "Administration");
    record62.set("pt", "Administra\u00e7\u00e3o");
    record62.set("fr", "Administration");
    record62.set("de", "Verwaltung");
  try {
    app.save(record62);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record63 = new Record(collection);
    record63.set("key", "admin.system_status");
    record63.set("es", "Estado del Sistema");
    record63.set("en", "System Status");
    record63.set("pt", "Status do Sistema");
    record63.set("fr", "\u00c9tat du Syst\u00e8me");
    record63.set("de", "Systemstatus");
  try {
    app.save(record63);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record64 = new Record(collection);
    record64.set("key", "admin.total_users");
    record64.set("es", "Total de Usuarios");
    record64.set("en", "Total Users");
    record64.set("pt", "Total de Usu\u00e1rios");
    record64.set("fr", "Total des Utilisateurs");
    record64.set("de", "Gesamtzahl der Benutzer");
  try {
    app.save(record64);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record65 = new Record(collection);
    record65.set("key", "admin.total_bots");
    record65.set("es", "Total de Bots");
    record65.set("en", "Total Bots");
    record65.set("pt", "Total de Bots");
    record65.set("fr", "Total des Bots");
    record65.set("de", "Gesamtzahl der Bots");
  try {
    app.save(record65);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record66 = new Record(collection);
    record66.set("key", "admin.active_users");
    record66.set("es", "Usuarios Activos");
    record66.set("en", "Active Users");
    record66.set("pt", "Usu\u00e1rios Ativos");
    record66.set("fr", "Utilisateurs Actifs");
    record66.set("de", "Aktive Benutzer");
  try {
    app.save(record66);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record67 = new Record(collection);
    record67.set("key", "admin.active_bots");
    record67.set("es", "Bots Activos");
    record67.set("en", "Active Bots");
    record67.set("pt", "Bots Ativos");
    record67.set("fr", "Bots Actifs");
    record67.set("de", "Aktive Bots");
  try {
    app.save(record67);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record68 = new Record(collection);
    record68.set("key", "admin.users_last_7_days");
    record68.set("es", "Usuarios (\u00faltimos 7 d\u00edas)");
    record68.set("en", "Users (last 7 days)");
    record68.set("pt", "Usu\u00e1rios (\u00faltimos 7 dias)");
    record68.set("fr", "Utilisateurs (7 derniers jours)");
    record68.set("de", "Benutzer (letzte 7 Tage)");
  try {
    app.save(record68);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record69 = new Record(collection);
    record69.set("key", "admin.bots_last_7_days");
    record69.set("es", "Bots (\u00faltimos 7 d\u00edas)");
    record69.set("en", "Bots (last 7 days)");
    record69.set("pt", "Bots (\u00faltimos 7 dias)");
    record69.set("fr", "Bots (7 derniers jours)");
    record69.set("de", "Bots (letzte 7 Tage)");
  try {
    app.save(record69);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record70 = new Record(collection);
    record70.set("key", "admin.activity_rate");
    record70.set("es", "Tasa de Actividad");
    record70.set("en", "Activity Rate");
    record70.set("pt", "Taxa de Atividade");
    record70.set("fr", "Taux d'Activit\u00e9");
    record70.set("de", "Aktivit\u00e4tsrate");
  try {
    app.save(record70);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record71 = new Record(collection);
    record71.set("key", "admin.last_activity");
    record71.set("es", "\u00daltima Actividad");
    record71.set("en", "Last Activity");
    record71.set("pt", "\u00daltima Atividade");
    record71.set("fr", "Derni\u00e8re Activit\u00e9");
    record71.set("de", "Letzte Aktivit\u00e4t");
  try {
    app.save(record71);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record72 = new Record(collection);
    record72.set("key", "admin.users");
    record72.set("es", "Usuarios");
    record72.set("en", "Users");
    record72.set("pt", "Usu\u00e1rios");
    record72.set("fr", "Utilisateurs");
    record72.set("de", "Benutzer");
  try {
    app.save(record72);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record73 = new Record(collection);
    record73.set("key", "admin.manage_users");
    record73.set("es", "Gestionar Usuarios");
    record73.set("en", "Manage Users");
    record73.set("pt", "Gerenciar Usu\u00e1rios");
    record73.set("fr", "G\u00e9rer les Utilisateurs");
    record73.set("de", "Benutzer Verwalten");
  try {
    app.save(record73);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record74 = new Record(collection);
    record74.set("key", "admin.user_list");
    record74.set("es", "Listado de Usuarios");
    record74.set("en", "User List");
    record74.set("pt", "Lista de Usu\u00e1rios");
    record74.set("fr", "Liste des Utilisateurs");
    record74.set("de", "Benutzerliste");
  try {
    app.save(record74);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record75 = new Record(collection);
    record75.set("key", "admin.role");
    record75.set("es", "Rol");
    record75.set("en", "Role");
    record75.set("pt", "Fun\u00e7\u00e3o");
    record75.set("fr", "R\u00f4le");
    record75.set("de", "Rolle");
  try {
    app.save(record75);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record76 = new Record(collection);
    record76.set("key", "admin.change_role");
    record76.set("es", "Cambiar Rol");
    record76.set("en", "Change Role");
    record76.set("pt", "Alterar Fun\u00e7\u00e3o");
    record76.set("fr", "Changer le R\u00f4le");
    record76.set("de", "Rolle \u00c4ndern");
  try {
    app.save(record76);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record77 = new Record(collection);
    record77.set("key", "admin.delete_user");
    record77.set("es", "Eliminar Usuario");
    record77.set("en", "Delete User");
    record77.set("pt", "Excluir Usu\u00e1rio");
    record77.set("fr", "Supprimer l'Utilisateur");
    record77.set("de", "Benutzer L\u00f6schen");
  try {
    app.save(record77);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record78 = new Record(collection);
    record78.set("key", "admin.translations");
    record78.set("es", "Traducciones");
    record78.set("en", "Translations");
    record78.set("pt", "Tradu\u00e7\u00f5es");
    record78.set("fr", "Traductions");
    record78.set("de", "\u00dcbersetzungen");
  try {
    app.save(record78);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record79 = new Record(collection);
    record79.set("key", "admin.manage_translations");
    record79.set("es", "Gestionar Traducciones");
    record79.set("en", "Manage Translations");
    record79.set("pt", "Gerenciar Tradu\u00e7\u00f5es");
    record79.set("fr", "G\u00e9rer les Traductions");
    record79.set("de", "\u00dcbersetzungen Verwalten");
  try {
    app.save(record79);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record80 = new Record(collection);
    record80.set("key", "admin.translation_key");
    record80.set("es", "Clave");
    record80.set("en", "Key");
    record80.set("pt", "Chave");
    record80.set("fr", "Cl\u00e9");
    record80.set("de", "Schl\u00fcssel");
  try {
    app.save(record80);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record81 = new Record(collection);
    record81.set("key", "admin.add_translation");
    record81.set("es", "Agregar Traducci\u00f3n");
    record81.set("en", "Add Translation");
    record81.set("pt", "Adicionar Tradu\u00e7\u00e3o");
    record81.set("fr", "Ajouter une Traduction");
    record81.set("de", "\u00dcbersetzung Hinzuf\u00fcgen");
  try {
    app.save(record81);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record82 = new Record(collection);
    record82.set("key", "admin.edit_translation");
    record82.set("es", "Editar Traducci\u00f3n");
    record82.set("en", "Edit Translation");
    record82.set("pt", "Editar Tradu\u00e7\u00e3o");
    record82.set("fr", "Modifier la Traduction");
    record82.set("de", "\u00dcbersetzung Bearbeiten");
  try {
    app.save(record82);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record83 = new Record(collection);
    record83.set("key", "admin.delete_translation");
    record83.set("es", "Eliminar Traducci\u00f3n");
    record83.set("en", "Delete Translation");
    record83.set("pt", "Excluir Tradu\u00e7\u00e3o");
    record83.set("fr", "Supprimer la Traduction");
    record83.set("de", "\u00dcbersetzung L\u00f6schen");
  try {
    app.save(record83);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record84 = new Record(collection);
    record84.set("key", "creator.title");
    record84.set("es", "Panel Creador");
    record84.set("en", "Creator Panel");
    record84.set("pt", "Painel do Criador");
    record84.set("fr", "Panneau Cr\u00e9ateur");
    record84.set("de", "Creator-Panel");
  try {
    app.save(record84);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record85 = new Record(collection);
    record85.set("key", "creator.dashboard");
    record85.set("es", "Dashboard");
    record85.set("en", "Dashboard");
    record85.set("pt", "Painel");
    record85.set("fr", "Tableau de Bord");
    record85.set("de", "Dashboard");
  try {
    app.save(record85);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record86 = new Record(collection);
    record86.set("key", "creator.manage_admins");
    record86.set("es", "Gestionar Admins");
    record86.set("en", "Manage Admins");
    record86.set("pt", "Gerenciar Admins");
    record86.set("fr", "G\u00e9rer les Admins");
    record86.set("de", "Admins Verwalten");
  try {
    app.save(record86);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record87 = new Record(collection);
    record87.set("key", "creator.manage_users");
    record87.set("es", "Gestionar Usuarios");
    record87.set("en", "Manage Users");
    record87.set("pt", "Gerenciar Usu\u00e1rios");
    record87.set("fr", "G\u00e9rer les Utilisateurs");
    record87.set("de", "Benutzer Verwalten");
  try {
    app.save(record87);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record88 = new Record(collection);
    record88.set("key", "creator.manage_bots");
    record88.set("es", "Gestionar Bots");
    record88.set("en", "Manage Bots");
    record88.set("pt", "Gerenciar Bots");
    record88.set("fr", "G\u00e9rer les Bots");
    record88.set("de", "Bots Verwalten");
  try {
    app.save(record88);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record89 = new Record(collection);
    record89.set("key", "creator.manage_blog");
    record89.set("es", "Gestionar Blog");
    record89.set("en", "Manage Blog");
    record89.set("pt", "Gerenciar Blog");
    record89.set("fr", "G\u00e9rer le Blog");
    record89.set("de", "Blog Verwalten");
  try {
    app.save(record89);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record90 = new Record(collection);
    record90.set("key", "creator.audit_logs");
    record90.set("es", "Logs de Auditor\u00eda");
    record90.set("en", "Audit Logs");
    record90.set("pt", "Logs de Auditoria");
    record90.set("fr", "Journaux d'Audit");
    record90.set("de", "Audit-Protokolle");
  try {
    app.save(record90);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record91 = new Record(collection);
    record91.set("key", "creator.settings");
    record91.set("es", "Configuraci\u00f3n");
    record91.set("en", "Settings");
    record91.set("pt", "Configura\u00e7\u00f5es");
    record91.set("fr", "Param\u00e8tres");
    record91.set("de", "Einstellungen");
  try {
    app.save(record91);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record92 = new Record(collection);
    record92.set("key", "creator.admins");
    record92.set("es", "Administradores");
    record92.set("en", "Administrators");
    record92.set("pt", "Administradores");
    record92.set("fr", "Administrateurs");
    record92.set("de", "Administratoren");
  try {
    app.save(record92);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record93 = new Record(collection);
    record93.set("key", "creator.promote_to_admin");
    record93.set("es", "Promover a Admin");
    record93.set("en", "Promote to Admin");
    record93.set("pt", "Promover a Admin");
    record93.set("fr", "Promouvoir en Admin");
    record93.set("de", "Zum Admin Bef\u00f6rdern");
  try {
    app.save(record93);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record94 = new Record(collection);
    record94.set("key", "creator.demote_admin");
    record94.set("es", "Degradar Admin");
    record94.set("en", "Demote Admin");
    record94.set("pt", "Rebaixar Admin");
    record94.set("fr", "R\u00e9trograder Admin");
    record94.set("de", "Admin Herabstufen");
  try {
    app.save(record94);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record95 = new Record(collection);
    record95.set("key", "creator.action");
    record95.set("es", "Acci\u00f3n");
    record95.set("en", "Action");
    record95.set("pt", "A\u00e7\u00e3o");
    record95.set("fr", "Action");
    record95.set("de", "Aktion");
  try {
    app.save(record95);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record96 = new Record(collection);
    record96.set("key", "creator.timestamp");
    record96.set("es", "Fecha y Hora");
    record96.set("en", "Timestamp");
    record96.set("pt", "Data e Hora");
    record96.set("fr", "Horodatage");
    record96.set("de", "Zeitstempel");
  try {
    app.save(record96);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record97 = new Record(collection);
    record97.set("key", "creator.user");
    record97.set("es", "Usuario");
    record97.set("en", "User");
    record97.set("pt", "Usu\u00e1rio");
    record97.set("fr", "Utilisateur");
    record97.set("de", "Benutzer");
  try {
    app.save(record97);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record98 = new Record(collection);
    record98.set("key", "blog_admin.title");
    record98.set("es", "Gestionar Blog");
    record98.set("en", "Manage Blog");
    record98.set("pt", "Gerenciar Blog");
    record98.set("fr", "G\u00e9rer le Blog");
    record98.set("de", "Blog Verwalten");
  try {
    app.save(record98);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record99 = new Record(collection);
    record99.set("key", "blog_admin.articles");
    record99.set("es", "Art\u00edculos");
    record99.set("en", "Articles");
    record99.set("pt", "Artigos");
    record99.set("fr", "Articles");
    record99.set("de", "Artikel");
  try {
    app.save(record99);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record100 = new Record(collection);
    record100.set("key", "blog_admin.create_article");
    record100.set("es", "Crear Art\u00edculo");
    record100.set("en", "Create Article");
    record100.set("pt", "Criar Artigo");
    record100.set("fr", "Cr\u00e9er un Article");
    record100.set("de", "Artikel Erstellen");
  try {
    app.save(record100);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record101 = new Record(collection);
    record101.set("key", "blog_admin.edit_article");
    record101.set("es", "Editar Art\u00edculo");
    record101.set("en", "Edit Article");
    record101.set("pt", "Editar Artigo");
    record101.set("fr", "Modifier l'Article");
    record101.set("de", "Artikel Bearbeiten");
  try {
    app.save(record101);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record102 = new Record(collection);
    record102.set("key", "blog_admin.delete_article");
    record102.set("es", "Eliminar Art\u00edculo");
    record102.set("en", "Delete Article");
    record102.set("pt", "Excluir Artigo");
    record102.set("fr", "Supprimer l'Article");
    record102.set("de", "Artikel L\u00f6schen");
  try {
    app.save(record102);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record103 = new Record(collection);
    record103.set("key", "blog_admin.article_title");
    record103.set("es", "T\u00edtulo del Art\u00edculo");
    record103.set("en", "Article Title");
    record103.set("pt", "T\u00edtulo do Artigo");
    record103.set("fr", "Titre de l'Article");
    record103.set("de", "Artikeltitel");
  try {
    app.save(record103);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record104 = new Record(collection);
    record104.set("key", "blog_admin.article_content");
    record104.set("es", "Contenido");
    record104.set("en", "Content");
    record104.set("pt", "Conte\u00fado");
    record104.set("fr", "Contenu");
    record104.set("de", "Inhalt");
  try {
    app.save(record104);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record105 = new Record(collection);
    record105.set("key", "blog_admin.article_excerpt");
    record105.set("es", "Resumen");
    record105.set("en", "Excerpt");
    record105.set("pt", "Resumo");
    record105.set("fr", "Extrait");
    record105.set("de", "Auszug");
  try {
    app.save(record105);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record106 = new Record(collection);
    record106.set("key", "blog_admin.article_category");
    record106.set("es", "Categor\u00eda");
    record106.set("en", "Category");
    record106.set("pt", "Categoria");
    record106.set("fr", "Cat\u00e9gorie");
    record106.set("de", "Kategorie");
  try {
    app.save(record106);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record107 = new Record(collection);
    record107.set("key", "blog_admin.article_tags");
    record107.set("es", "Etiquetas");
    record107.set("en", "Tags");
    record107.set("pt", "Etiquetas");
    record107.set("fr", "\u00c9tiquettes");
    record107.set("de", "Tags");
  try {
    app.save(record107);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record108 = new Record(collection);
    record108.set("key", "blog_admin.featured_image");
    record108.set("es", "Imagen Destacada");
    record108.set("en", "Featured Image");
    record108.set("pt", "Imagem Destacada");
    record108.set("fr", "Image Vedette");
    record108.set("de", "Hervorgehobenes Bild");
  try {
    app.save(record108);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record109 = new Record(collection);
    record109.set("key", "blog_admin.publish");
    record109.set("es", "Publicar");
    record109.set("en", "Publish");
    record109.set("pt", "Publicar");
    record109.set("fr", "Publier");
    record109.set("de", "Ver\u00f6ffentlichen");
  try {
    app.save(record109);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record110 = new Record(collection);
    record110.set("key", "blog_admin.draft");
    record110.set("es", "Borrador");
    record110.set("en", "Draft");
    record110.set("pt", "Rascunho");
    record110.set("fr", "Brouillon");
    record110.set("de", "Entwurf");
  try {
    app.save(record110);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record111 = new Record(collection);
    record111.set("key", "blog_admin.published");
    record111.set("es", "Publicado");
    record111.set("en", "Published");
    record111.set("pt", "Publicado");
    record111.set("fr", "Publi\u00e9");
    record111.set("de", "Ver\u00f6ffentlicht");
  try {
    app.save(record111);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record112 = new Record(collection);
    record112.set("key", "blog_admin.comments");
    record112.set("es", "Comentarios");
    record112.set("en", "Comments");
    record112.set("pt", "Coment\u00e1rios");
    record112.set("fr", "Commentaires");
    record112.set("de", "Kommentare");
  try {
    app.save(record112);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record113 = new Record(collection);
    record113.set("key", "blog_admin.approve_comment");
    record113.set("es", "Aprobar Comentario");
    record113.set("en", "Approve Comment");
    record113.set("pt", "Aprovar Coment\u00e1rio");
    record113.set("fr", "Approuver le Commentaire");
    record113.set("de", "Kommentar Genehmigen");
  try {
    app.save(record113);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record114 = new Record(collection);
    record114.set("key", "blog_admin.reject_comment");
    record114.set("es", "Rechazar Comentario");
    record114.set("en", "Reject Comment");
    record114.set("pt", "Rejeitar Coment\u00e1rio");
    record114.set("fr", "Rejeter le Commentaire");
    record114.set("de", "Kommentar Ablehnen");
  try {
    app.save(record114);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record115 = new Record(collection);
    record115.set("key", "blog_admin.pending_approval");
    record115.set("es", "Pendiente de Aprobaci\u00f3n");
    record115.set("en", "Pending Approval");
    record115.set("pt", "Pendente de Aprova\u00e7\u00e3o");
    record115.set("fr", "En Attente d'Approbation");
    record115.set("de", "Genehmigung Ausstehend");
  try {
    app.save(record115);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record116 = new Record(collection);
    record116.set("key", "common.save");
    record116.set("es", "Guardar");
    record116.set("en", "Save");
    record116.set("pt", "Salvar");
    record116.set("fr", "Enregistrer");
    record116.set("de", "Speichern");
  try {
    app.save(record116);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record117 = new Record(collection);
    record117.set("key", "common.cancel");
    record117.set("es", "Cancelar");
    record117.set("en", "Cancel");
    record117.set("pt", "Cancelar");
    record117.set("fr", "Annuler");
    record117.set("de", "Abbrechen");
  try {
    app.save(record117);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record118 = new Record(collection);
    record118.set("key", "common.delete");
    record118.set("es", "Eliminar");
    record118.set("en", "Delete");
    record118.set("pt", "Excluir");
    record118.set("fr", "Supprimer");
    record118.set("de", "L\u00f6schen");
  try {
    app.save(record118);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record119 = new Record(collection);
    record119.set("key", "common.edit");
    record119.set("es", "Editar");
    record119.set("en", "Edit");
    record119.set("pt", "Editar");
    record119.set("fr", "Modifier");
    record119.set("de", "Bearbeiten");
  try {
    app.save(record119);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record120 = new Record(collection);
    record120.set("key", "common.create");
    record120.set("es", "Crear");
    record120.set("en", "Create");
    record120.set("pt", "Criar");
    record120.set("fr", "Cr\u00e9er");
    record120.set("de", "Erstellen");
  try {
    app.save(record120);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record121 = new Record(collection);
    record121.set("key", "common.update");
    record121.set("es", "Actualizar");
    record121.set("en", "Update");
    record121.set("pt", "Atualizar");
    record121.set("fr", "Mettre \u00e0 Jour");
    record121.set("de", "Aktualisieren");
  try {
    app.save(record121);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record122 = new Record(collection);
    record122.set("key", "common.close");
    record122.set("es", "Cerrar");
    record122.set("en", "Close");
    record122.set("pt", "Fechar");
    record122.set("fr", "Fermer");
    record122.set("de", "Schlie\u00dfen");
  try {
    app.save(record122);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record123 = new Record(collection);
    record123.set("key", "common.confirm");
    record123.set("es", "Confirmar");
    record123.set("en", "Confirm");
    record123.set("pt", "Confirmar");
    record123.set("fr", "Confirmer");
    record123.set("de", "Best\u00e4tigen");
  try {
    app.save(record123);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record124 = new Record(collection);
    record124.set("key", "common.yes");
    record124.set("es", "S\u00ed");
    record124.set("en", "Yes");
    record124.set("pt", "Sim");
    record124.set("fr", "Oui");
    record124.set("de", "Ja");
  try {
    app.save(record124);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record125 = new Record(collection);
    record125.set("key", "common.no");
    record125.set("es", "No");
    record125.set("en", "No");
    record125.set("pt", "N\u00e3o");
    record125.set("fr", "Non");
    record125.set("de", "Nein");
  try {
    app.save(record125);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record126 = new Record(collection);
    record126.set("key", "common.loading");
    record126.set("es", "Cargando...");
    record126.set("en", "Loading...");
    record126.set("pt", "Carregando...");
    record126.set("fr", "Chargement...");
    record126.set("de", "Wird geladen...");
  try {
    app.save(record126);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record127 = new Record(collection);
    record127.set("key", "common.error");
    record127.set("es", "Error");
    record127.set("en", "Error");
    record127.set("pt", "Erro");
    record127.set("fr", "Erreur");
    record127.set("de", "Fehler");
  try {
    app.save(record127);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record128 = new Record(collection);
    record128.set("key", "common.success");
    record128.set("es", "\u00c9xito");
    record128.set("en", "Success");
    record128.set("pt", "Sucesso");
    record128.set("fr", "Succ\u00e8s");
    record128.set("de", "Erfolg");
  try {
    app.save(record128);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record129 = new Record(collection);
    record129.set("key", "common.warning");
    record129.set("es", "Advertencia");
    record129.set("en", "Warning");
    record129.set("pt", "Aviso");
    record129.set("fr", "Avertissement");
    record129.set("de", "Warnung");
  try {
    app.save(record129);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record130 = new Record(collection);
    record130.set("key", "common.info");
    record130.set("es", "Informaci\u00f3n");
    record130.set("en", "Information");
    record130.set("pt", "Informa\u00e7\u00e3o");
    record130.set("fr", "Information");
    record130.set("de", "Information");
  try {
    app.save(record130);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})